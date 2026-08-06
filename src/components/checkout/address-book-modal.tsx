"use client";

import { type ReactNode, useState, useEffect, useRef } from "react";
import {
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import type { LucideIcon } from "lucide-react";
import {
  Building2,
  Check,
  ChevronLeft,
  CircleAlert,
  CircleCheck,
  Home,
  LocateFixed,
  Loader2,
  MapPin,
  Move,
  Navigation,
  Pencil,
  Phone,
  Plus,
  RefreshCcw,
  Star,
  Trash2,
  UserRound,
} from "lucide-react";

import { cn } from "@/lib/utils";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

import {
  AddressCascader,
  type Location,
} from "./address-cascader";
import { OsmMap } from "./osm-map";

const formSchema = z.object({
  name: z.string().trim().min(2, "Nhập họ và tên"),
  phone: z
    .string()
    .trim()
    .min(9, "Số điện thoại chưa đúng")
    .max(15, "Số điện thoại chưa đúng")
    .refine(
      (value) => /^[0-9+\s().-]+$/.test(value),
      "Số điện thoại chưa đúng"
    ),
  address: z.string().trim().min(3, "Nhập số nhà và tên đường"),
  location: z
    .object({
      province: z.any().optional(),
      district: z.any().optional(),
      ward: z.any().optional(),
    })
    .refine(
      (value) =>
        Boolean(value.province && value.ward),
      {
        message: "Chọn đầy đủ tỉnh và phường",
      }
    ),
  mapCoordinates: z.object({
    lat: z.number().optional(),
    lng: z.number().optional(),
  }),
  addressType: z.enum(["home", "office"]),
  isDefault: z.boolean(),
});

type FormValues = z.infer<typeof formSchema>;

type Address = {
  id: string;
  name: string;
  phone: string;
  address: string;
  provinceId: string;
  provinceName: string;
  districtId: string;
  districtName: string;
  wardId: string;
  wardName: string;
  latitude?: number | null;
  longitude?: number | null;
  isDefault: boolean;
};

type AddressPayload = Omit<Address, "id">;

type AddressBookModalProps = {
  onSelectAddress: (address: Address) => void;
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
};

type FormRowProps = {
  icon: LucideIcon;
  children: ReactNode;
  error?: string;
  divider?: boolean;
};

function FormRow({
  icon: Icon,
  children,
  error,
  divider,
}: FormRowProps) {
  return (
    <>
      <div className="flex min-h-[52px] items-center gap-3 px-4">
        <Icon
          className={cn(
            "h-[18px] w-[18px] shrink-0 transition-colors",
            error
              ? "text-destructive"
              : "text-muted-foreground/70"
          )}
        />

        <div className="min-w-0 flex-1">{children}</div>
      </div>

      {error && (
        <p className="px-4 pl-11 pb-2.5 text-xs font-medium text-destructive">
          {error}
        </p>
      )}

      {divider && (
        <div className="ml-11 border-t border-border/40" />
      )}
    </>
  );
}

function formatPhone(phone: string) {
  const normalized = phone.replace(/\s/g, "");

  if (normalized.startsWith("+84")) {
    return `(+84) ${normalized.slice(3)}`;
  }

  if (normalized.startsWith("0")) {
    return `(+84) ${normalized.slice(1)}`;
  }

  return phone;
}

export function AddressBookModal({
  onSelectAddress,
  isOpen,
  onOpenChange,
}: AddressBookModalProps) {
  const queryClient = useQueryClient();

  const [view, setView] = useState<"list" | "form">("list");
  const [editingId, setEditingId] = useState<string | null>(
    null
  );
  const [manualGeocodeLocation, setManualGeocodeLocation] = useState<{
    provinceName: string;
    wardName: string;
  } | null>(null);
  const [isReverseGeocoding, setIsReverseGeocoding] = useState(false);
  const [isRequestingCurrentLocation, setIsRequestingCurrentLocation] = useState(false);
  const [hasCurrentLocationPermission, setHasCurrentLocationPermission] = useState(false);
  const [currentLocationError, setCurrentLocationError] = useState<string | null>(null);
  const [hasConfirmedExactLocation, setHasConfirmedExactLocation] = useState(false);
  const [exactLocationError, setExactLocationError] = useState<string | null>(null);
  const [hasConfirmedAddressMapping, setHasConfirmedAddressMapping] = useState(false);
  const [addressMappingError, setAddressMappingError] = useState<string | null>(null);
  const reverseRequestRef = useRef(0);

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    mode: "onTouched",
    defaultValues: {
      name: "",
      phone: "",
      address: "",
      location: {},
      mapCoordinates: {},
      addressType: "home",
      isDefault: false,
    },
  });

  const {
    register,
    watch,
    setValue,
    getValues,
    handleSubmit,
    reset,
    formState: { errors },
  } = form;

  const resetForm = () => {
    reset({
      name: "",
      phone: "",
      address: "",
      location: {},
      mapCoordinates: {},
      addressType: "home",
      isDefault: false,
    });

    reverseRequestRef.current += 1;
    setIsReverseGeocoding(false);
    setManualGeocodeLocation(null);
    setIsRequestingCurrentLocation(false);
    setHasCurrentLocationPermission(false);
    setCurrentLocationError(null);
    setHasConfirmedExactLocation(false);
    setExactLocationError(null);
    setHasConfirmedAddressMapping(false);
    setAddressMappingError(null);
    setEditingId(null);
  };

  const handleDialogChange = (open: boolean) => {
    if (!open) {
      setView("list");
      resetForm();
    }

    onOpenChange(open);
  };

  const handleBack = () => {
    setView("list");
    resetForm();
  };

  const {
    data: addresses = [],
    isLoading,
    isError,
    refetch,
  } = useQuery({
    queryKey: ["user-addresses"],
    queryFn: async () => {
      const response = await fetch("/api/user/addresses");

      if (!response.ok) {
        throw new Error("Failed to fetch addresses");
      }

      const json = await response.json();
      return json.data as Address[];
    },
    staleTime: 60_000,
  });

  const geocodeQuery = useQuery<{
    success: boolean;
    data: { lat: number; lng: number; displayName: string | null };
  }>({
    queryKey: [
      "location-geocode",
      manualGeocodeLocation?.provinceName,
      manualGeocodeLocation?.wardName,
    ],
    queryFn: async ({ signal }) => {
      const response = await fetch(
        `/api/locations/geocode?province=${encodeURIComponent(manualGeocodeLocation!.provinceName)}&ward=${encodeURIComponent(manualGeocodeLocation!.wardName)}`,
        { signal }
      );
      const result = await response.json();
      if (!response.ok || !result.success) {
        throw new Error(result.message || "Không tìm thấy vị trí trên bản đồ");
      }
      return result;
    },
    enabled: Boolean(manualGeocodeLocation),
    staleTime: 7 * 24 * 60 * 60_000,
    refetchOnWindowFocus: false,
    retry: false,
  });

  useEffect(() => {
    if (!manualGeocodeLocation || !geocodeQuery.data?.data) return;

    setValue(
      "mapCoordinates",
      {
        lat: geocodeQuery.data.data.lat,
        lng: geocodeQuery.data.data.lng,
      },
      { shouldDirty: true, shouldValidate: true }
    );
    setManualGeocodeLocation(null);
  }, [geocodeQuery.data, manualGeocodeLocation, setValue]);

  useEffect(() => {
    if (!manualGeocodeLocation || !geocodeQuery.isError) return;
    toast.error(
      geocodeQuery.error instanceof Error
        ? geocodeQuery.error.message
        : "Không tìm thấy vị trí trên bản đồ"
    );
    setManualGeocodeLocation(null);
  }, [geocodeQuery.error, geocodeQuery.isError, manualGeocodeLocation]);

  useEffect(() => {
    if (isOpen && !isLoading && !isError && addresses.length === 0 && view === "list") {
      setView("form");
    }
  }, [isOpen, isLoading, isError, addresses.length, view]);

  const saveMutation = useMutation({
    mutationFn: async ({
      id,
      payload,
    }: {
      id: string | null;
      payload: AddressPayload;
    }) => {
      const url = id
        ? `/api/user/addresses/${id}`
        : "/api/user/addresses";

      const response = await fetch(url, {
        method: id ? "PUT" : "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        throw new Error("Failed to save address");
      }

      return response.json();
    },

    onMutate: async ({ id, payload }) => {
      await queryClient.cancelQueries({ queryKey: ["user-addresses"] });
      const previousAddresses = queryClient.getQueryData<Address[]>(["user-addresses"]);

      if (id) {
        queryClient.setQueryData<Address[]>(["user-addresses"], (old = []) =>
          old.map((item) =>
            item.id === id
              ? {
                ...item,
                ...payload,
                isDefault: payload.isDefault ? true : (payload.isDefault === false ? false : item.isDefault),
              }
              : payload.isDefault
                ? { ...item, isDefault: false }
                : item
          )
        );
      }

      return { previousAddresses };
    },

    onError: (_err, _variables, context) => {
      if (context?.previousAddresses) {
        queryClient.setQueryData(["user-addresses"], context.previousAddresses);
      }
      toast.error("Không thể lưu địa chỉ");
    },

    onSuccess: (result, variables) => {
      toast.success(
        variables.id
          ? "Đã cập nhật địa chỉ"
          : "Đã thêm địa chỉ"
      );

      // Instantly inject the newly created address into the cache.
      // This ensures addresses.length > 0 before we switch back to "list" view,
      // preventing the auto-open hook from bouncing us back to the form.
      if (!variables.id && result?.data) {
        queryClient.setQueryData<Address[]>(["user-addresses"], (old = []) => {
          const newAddress = result.data;
          return [
            ...old.map(a => newAddress.isDefault ? { ...a, isDefault: false } : a),
            newAddress
          ];
        });
      }

      setView("list");
      resetForm();
    },

    onSettled: () => {
      queryClient.invalidateQueries({
        queryKey: ["user-addresses"],
      });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const response = await fetch(
        `/api/user/addresses/${id}`,
        {
          method: "DELETE",
        }
      );

      if (!response.ok) {
        throw new Error("Failed to delete address");
      }

      return response.json();
    },

    onMutate: async (deletedId: string) => {
      await queryClient.cancelQueries({ queryKey: ["user-addresses"] });
      const previousAddresses = queryClient.getQueryData<Address[]>(["user-addresses"]);

      queryClient.setQueryData<Address[]>(["user-addresses"], (old = []) =>
        old.filter((item) => item.id !== deletedId)
      );

      return { previousAddresses };
    },

    onError: (_err, _deletedId, context) => {
      if (context?.previousAddresses) {
        queryClient.setQueryData(["user-addresses"], context.previousAddresses);
      }
      toast.error("Không thể xóa địa chỉ");
    },

    onSuccess: () => {
      toast.success("Đã xóa địa chỉ");
    },

    onSettled: () => {
      queryClient.invalidateQueries({
        queryKey: ["user-addresses"],
      });
    },
  });

  const setDefaultMutation = useMutation({
    mutationFn: async (id: string) => {
      const response = await fetch(
        `/api/user/addresses/${id}`,
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            isDefault: true,
          }),
        }
      );

      if (!response.ok) {
        throw new Error("Failed to set default address");
      }

      return response.json();
    },

    onMutate: async (defaultId: string) => {
      await queryClient.cancelQueries({ queryKey: ["user-addresses"] });
      const previousAddresses = queryClient.getQueryData<Address[]>(["user-addresses"]);

      queryClient.setQueryData<Address[]>(["user-addresses"], (old = []) =>
        old.map((item) => ({
          ...item,
          isDefault: item.id === defaultId,
        }))
      );

      return { previousAddresses };
    },

    onError: (_err, _defaultId, context) => {
      if (context?.previousAddresses) {
        queryClient.setQueryData(["user-addresses"], context.previousAddresses);
      }
      toast.error("Không thể cập nhật địa chỉ");
    },

    onSuccess: () => {
      toast.success("Đã đặt làm địa chỉ mặc định");
    },

    onSettled: () => {
      queryClient.invalidateQueries({
        queryKey: ["user-addresses"],
      });
    },
  });

  const onSubmit = (data: FormValues) => {
    if (!editingId && !hasCurrentLocationPermission) {
      const message = "Vui lòng cho phép truy cập vị trí hiện tại trước khi lưu địa chỉ.";
      setCurrentLocationError(message);
      toast.error(message);
      return;
    }

    if (!hasConfirmedExactLocation) {
      const message = "Kéo bản đồ và thả pin đúng cửa hoặc điểm nhận hàng trước khi lưu.";
      setExactLocationError(message);
      toast.error(message);
      return;
    }

    if (!hasConfirmedAddressMapping) {
      const message = "Vui lòng xác nhận địa chỉ hiển thị khớp với vị trí ghim trên bản đồ.";
      setAddressMappingError(message);
      toast.error(message);
      return;
    }

    saveMutation.mutate({
      id: editingId,
      payload: {
        name: data.name,
        phone: data.phone,
        address: data.address,
        provinceId: data.location.province.location_id,
        provinceName: data.location.province.name,
        districtId: data.location.district?.location_id || data.location.ward?.parent_id || "0",
        districtName: data.location.district?.name || "",
        wardId: data.location.ward.location_id,
        wardName: data.location.ward.name,
        latitude: data.mapCoordinates.lat ?? null,
        longitude: data.mapCoordinates.lng ?? null,
        isDefault: data.isDefault,
      },
    });
  };

  const clearStreetWhenWardChanges = (nextWardId?: string) => {
    const currentWardId = getValues("location")?.ward?.location_id;
    if (currentWardId && currentWardId !== nextWardId) {
      setValue("address", "", {
        shouldDirty: true,
        shouldTouch: true,
        shouldValidate: true,
      });
      setHasConfirmedAddressMapping(false);
      setAddressMappingError(null);
    }
  };

  const handleEdit = (address: Address) => {
    setEditingId(address.id);

    reset({
      name: address.name,
      phone: address.phone,
      address: address.address,
      isDefault: address.isDefault,
      addressType: "home",
      location: {
        province: {
          location_id: address.provinceId,
          name: address.provinceName,
        } as Location,
        district: address.districtId ? {
          location_id: address.districtId,
          name: address.districtName,
        } as Location : undefined,
        ward: {
          location_id: address.wardId,
          name: address.wardName,
        } as Location,
      },
      mapCoordinates: {
        lat: address.latitude ?? undefined,
        lng: address.longitude ?? undefined,
      },
    });

    setHasConfirmedExactLocation(
      address.latitude != null && address.longitude != null
    );
    setExactLocationError(null);
    setHasConfirmedAddressMapping(false);
    setAddressMappingError(null);

    setView("form");
  };

  const handleSelect = (address: Address) => {
    onSelectAddress(address);
    handleDialogChange(false);
  };

  const handleDelete = (address: Address) => {
    const confirmed = window.confirm(
      `Xóa địa chỉ của ${address.name}?`
    );

    if (confirmed) {
      deleteMutation.mutate(address.id);
    }
  };

  const locationError =
    typeof errors.location?.message === "string"
      ? errors.location.message
      : undefined;

  const addressType = watch("addressType");
  const location = watch("location");
  const coordinates = watch("mapCoordinates");
  const streetAddress = watch("address");
  const isResolvingLocation = geocodeQuery.isFetching || isReverseGeocoding;
  const isLocationBusy = isResolvingLocation || isRequestingCurrentLocation;
  const needsCurrentLocation = !editingId && !hasCurrentLocationPermission;
  const mappedAdministrativeAddress = [
    location?.ward?.name,
    location?.district?.name,
    location?.province?.name,
  ]
    .filter(Boolean)
    .filter((part, index, parts) => parts.indexOf(part) === index)
    .join(", ");
  const canConfirmAddressMapping = Boolean(
    hasConfirmedExactLocation &&
    streetAddress?.trim() &&
    location?.province &&
    location?.ward &&
    coordinates.lat != null &&
    coordinates.lng != null &&
    !isLocationBusy
  );

  return (
    <Dialog
      open={isOpen}
      onOpenChange={handleDialogChange}
    >
      <DialogContent
        className="
          flex h-dvh max-h-none w-full max-w-none
          sm:h-[92dvh] sm:max-h-[820px] sm:w-[calc(100%-24px)] sm:max-w-[560px]
          md:max-w-[860px] flex-col gap-0 overflow-hidden
          rounded-none sm:rounded-md border-0 ring-0 shadow-2xl p-0
          bg-background transition-all duration-300
        "
      >
        <DialogHeader
          className="
            shrink-0 border-b border-border/40
            bg-background/80 px-4 py-3.5
            backdrop-blur-xl
          "
        >
          {view === "form" ? (
            <div className="grid grid-cols-[40px_1fr_40px] items-center">
              {addresses.length > 0 ? (
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 rounded-full bg-secondary/60 hover:bg-secondary text-foreground p-0"
                  onClick={handleBack}
                  aria-label="Trở lại"
                >
                  <ChevronLeft className="h-5 w-5" />
                </Button>
              ) : (
                <div />
              )}

              <DialogTitle className="text-center text-[17px] font-semibold text-foreground">
                {editingId
                  ? "Sửa địa chỉ"
                  : "Địa chỉ mới"}
              </DialogTitle>

              <div />
            </div>
          ) : (
            <div className="flex items-center justify-between pr-8">
              <div className="flex min-w-0 items-center gap-2.5">
                <div
                  className="
                    flex h-8 w-8 shrink-0 items-center
                    justify-center rounded-full
                    bg-primary/10 text-primary
                  "
                >
                  <MapPin className="h-4 w-4" />
                </div>

                <DialogTitle className="text-[17px] font-semibold text-foreground">
                  Sổ địa chỉ
                </DialogTitle>

                {!isLoading && addresses.length > 0 && (
                  <span
                    className="
                      rounded-full bg-secondary px-2.5 py-0.5
                      text-xs font-semibold text-muted-foreground
                    "
                  >
                    {addresses.length}
                  </span>
                )}
              </div>
            </div>
          )}

          <DialogDescription className="sr-only">
            Chọn, thêm hoặc chỉnh sửa địa chỉ giao hàng.
          </DialogDescription>
        </DialogHeader>

        {view === "list" ? (
          <div className="flex min-h-0 flex-1 flex-col">
            <div className="flex-1 overflow-y-auto p-4 sm:p-5">
              {isLoading ? (
                <div className="space-y-3">
                  {[0, 1, 2].map((item) => (
                    <div
                      key={item}
                      className="
                        h-[120px] animate-pulse rounded-none
                        bg-secondary/40 border-0
                      "
                    />
                  ))}
                </div>
              ) : isError ? (
                <div className="flex min-h-[280px] flex-col items-center justify-center px-6 text-center">
                  <div
                    className="
                      mb-4 flex h-12 w-12 items-center
                      justify-center rounded-full
                      bg-destructive/10 text-destructive
                    "
                  >
                    <CircleAlert className="h-5 w-5" />
                  </div>

                  <p className="font-medium">
                    Không tải được địa chỉ
                  </p>

                  <Button
                    type="button"
                    variant="ghost"
                    className="mt-2 rounded-full text-primary"
                    onClick={() => refetch()}
                  >
                    <RefreshCcw className="mr-2 h-4 w-4" />
                    Thử lại
                  </Button>
                </div>
              ) : addresses.length > 0 ? (
                <div className="space-y-3">
                  {addresses.map((address) => (
                    <div
                      key={address.id}
                      className={`
                        relative overflow-hidden rounded-sm
                        border shadow-sm transition-all duration-150
                        hover:bg-secondary/20 active:scale-[0.99]
                        focus-within:border-primary focus-within:ring-1 focus-within:ring-primary focus-within:bg-primary/[0.02]
                        ${address.isDefault ? 'border-primary bg-primary/[0.02]' : 'border-border bg-card'}
                      `}
                    >
                      <button
                        type="button"
                        className="
                          w-full flex items-center
                          gap-3.5 p-4 pr-[110px] sm:pr-[190px] text-left
                          outline-none focus:outline-none transition-colors
                        "
                        onClick={() => handleSelect(address)}
                      >


                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                            <span className="font-semibold text-foreground text-[15px]">
                              {address.name}
                            </span>

                            <span className="text-sm text-muted-foreground">
                              {formatPhone(address.phone)}
                            </span>
                          </div>

                          <div className="mt-1 text-sm leading-relaxed">
                            <p className="font-medium text-foreground text-[14px]">
                              {address.address}
                            </p>
                            <p className="text-xs text-muted-foreground mt-0.5">
                              {[address.wardName, address.districtName, address.provinceName]
                                .filter(Boolean)
                                .join(", ")}
                            </p>
                          </div>

                          {address.isDefault && (
                            <span
                              className="
                                mt-2 inline-flex items-center gap-1
                                rounded-full bg-primary/10
                                px-2.5 py-0.5 text-[11px]
                                font-semibold text-primary
                              "
                            >
                              <CircleCheck className="h-3 w-3" />
                              Mặc định
                            </span>
                          )}
                        </div>
                      </button>

                      <div className="absolute top-3 right-3 flex items-center gap-1 z-10">
                        {!address.isDefault && (
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            title="Đặt làm mặc định"
                            disabled={setDefaultMutation.isPending}
                            onClick={(e) => {
                              e.stopPropagation();
                              setDefaultMutation.mutate(address.id);
                            }}
                            className="h-8 px-2 rounded-sm text-xs font-medium text-muted-foreground hover:text-primary hover:bg-primary/10 transition-colors border-0 flex items-center justify-center"
                          >
                            <Star className="h-3.5 w-3.5 sm:mr-1" />
                            <span className="hidden sm:inline">Mặc định</span>
                          </Button>
                        )}

                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          title="Chỉnh sửa"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleEdit(address);
                          }}
                          className="h-8 px-2 rounded-sm text-xs font-medium text-foreground hover:bg-background/80 hover:text-primary transition-colors border-0 flex items-center justify-center"
                        >
                          <Pencil className="h-3.5 w-3.5 sm:mr-1" />
                          <span className="hidden sm:inline">Sửa</span>
                        </Button>

                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          title="Xóa"
                          disabled={deleteMutation.isPending}
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDelete(address);
                          }}
                          className="h-8 px-2 rounded-sm text-xs font-medium text-red-500 hover:text-red-600 hover:bg-red-500/10 dark:text-red-400 dark:hover:text-red-300 dark:hover:bg-red-500/10 transition-colors border-0 flex items-center justify-center"
                        >
                          <Trash2 className="h-3.5 w-3.5 sm:mr-1 shrink-0" />
                          <span className="hidden sm:inline">Xóa</span>
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="flex min-h-[280px] flex-col items-center justify-center px-6 text-center">
                  <div
                    className="
                      mb-4 flex h-14 w-14 items-center
                      justify-center rounded-full
                      bg-secondary text-muted-foreground
                    "
                  >
                    <MapPin className="h-6 w-6" />
                  </div>

                  <p className="font-semibold text-foreground">
                    Chưa có địa chỉ
                  </p>

                  <p className="mt-1 text-sm text-muted-foreground">
                    Thêm địa chỉ để thanh toán nhanh hơn.
                  </p>
                </div>
              )}
            </div>

            <div
              className="
                shrink-0 border-t border-border/40
                bg-background/80 p-4 backdrop-blur-xl
              "
              style={{
                paddingBottom: "calc(1rem + env(safe-area-inset-bottom, 0px))",
              }}
            >
              <Button
                type="button"
                className="
                  h-10 w-full rounded-sm border-0
                  bg-primary text-primary-foreground font-semibold
                  hover:bg-primary/90 active:scale-[0.99]
                  shadow-sm transition-all
                "
                onClick={() => {
                  resetForm();
                  setView("form");
                }}
              >
                <Plus className="mr-2 h-5 w-5" />
                Thêm địa chỉ
              </Button>
            </div>
          </div>
        ) : (
          <form
            noValidate
            onSubmit={(e) => {
              e.preventDefault();
              e.stopPropagation();
              handleSubmit(onSubmit)(e);
            }}
            className="flex min-h-0 flex-1 flex-col"
          >
            <div className="flex-1 overflow-y-auto p-4 sm:p-5">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-5 items-stretch min-h-full">
                {/* Left Column: Form Fields */}
                <div className="contents md:block md:space-y-4">
                  {/* Contact */}
                  <div
                    className="
                      grid grid-cols-2 overflow-hidden rounded-sm
                      bg-card border-0 shadow-sm
                    "
                  >
                    <div className="min-w-0 border-r border-border/40">
                      <FormRow
                        icon={UserRound}
                        error={errors.name?.message}
                      >
                        <Input
                          autoComplete="name"
                          placeholder="Họ và tên"
                          aria-invalid={Boolean(errors.name)}
                          {...register("name")}
                          className="
                            h-12 min-w-0 border-0 bg-transparent px-0
                            text-[15px] shadow-none outline-none
                            placeholder:text-muted-foreground/50
                            focus-visible:ring-0 focus-visible:border-0
                            aria-invalid:ring-0 aria-invalid:border-0
                          "
                        />
                      </FormRow>
                    </div>

                    <div className="min-w-0">
                      <FormRow
                        icon={Phone}
                        error={errors.phone?.message}
                      >
                        <Input
                          type="tel"
                          inputMode="tel"
                          autoComplete="tel"
                          placeholder="Số điện thoại"
                          aria-invalid={Boolean(errors.phone)}
                          {...register("phone")}
                          className="
                            h-12 min-w-0 border-0 bg-transparent px-0
                            text-[15px] shadow-none outline-none
                            placeholder:text-muted-foreground/50
                            focus-visible:ring-0 focus-visible:border-0
                            aria-invalid:ring-0 aria-invalid:border-0
                          "
                        />
                      </FormRow>
                    </div>
                  </div>

                  {/* Address */}
                  <div
                    className="
                      overflow-hidden rounded-sm
                      bg-card border-0 shadow-sm
                    "
                  >
                    <FormRow
                      icon={MapPin}
                      error={locationError}
                      divider
                    >
                      <div className="py-1">
                        <AddressCascader
                          value={location}
                          onChange={(value) => {
                            clearStreetWhenWardChanges(value.ward?.location_id);
                            setHasConfirmedAddressMapping(false);
                            setAddressMappingError(null);
                            setValue("location", value, {
                              shouldDirty: true,
                              shouldValidate: true,
                            });

                            if (value.province?.name && value.ward?.name) {
                              reverseRequestRef.current += 1;
                              setIsReverseGeocoding(false);
                              setValue("mapCoordinates", {}, { shouldDirty: true });
                              setHasConfirmedExactLocation(false);
                              setExactLocationError(null);
                              setManualGeocodeLocation({
                                provinceName: value.province.name,
                                wardName: value.ward.name,
                              });
                            } else {
                              setManualGeocodeLocation(null);
                              setValue("mapCoordinates", {}, { shouldDirty: true });
                              setHasConfirmedExactLocation(false);
                              setExactLocationError(null);
                            }
                          }}
                        />
                      </div>
                    </FormRow>

                    <FormRow
                      icon={Navigation}
                      error={errors.address?.message}
                    >
                      <Input
                        autoComplete="street-address"
                        placeholder="Số nhà, tên đường"
                        aria-invalid={Boolean(errors.address)}
                        {...register("address", {
                          onChange: () => {
                            setHasConfirmedAddressMapping(false);
                            setAddressMappingError(null);
                          },
                        })}
                        className="
                          h-12 border-0 bg-transparent px-0
                          text-[15px] shadow-none outline-none
                          placeholder:text-muted-foreground/50
                          focus-visible:ring-0 focus-visible:border-0
                          aria-invalid:ring-0 aria-invalid:border-0
                        "
                      />
                    </FormRow>
                  </div>

                  {/* Address type */}
                  <div className="order-4 grid grid-cols-2 gap-1 rounded-sm bg-secondary/30 p-1 border-0">
                    <button
                      type="button"
                      aria-pressed={addressType === "home"}
                      onClick={() =>
                        setValue("addressType", "home", {
                          shouldDirty: true,
                        })
                      }
                      className={cn(
                        "flex h-10 items-center justify-center gap-2 rounded-sm text-sm font-medium transition-all border-0",
                        addressType === "home"
                          ? "bg-primary/10 text-primary shadow-sm"
                          : "text-muted-foreground hover:text-foreground"
                      )}
                    >
                      <Home className="h-4 w-4" />
                      Nhà
                    </button>

                    <button
                      type="button"
                      aria-pressed={addressType === "office"}
                      onClick={() =>
                        setValue("addressType", "office", {
                          shouldDirty: true,
                        })
                      }
                      className={cn(
                        "flex h-10 items-center justify-center gap-2 rounded-sm text-sm font-medium transition-all border-0",
                        addressType === "office"
                          ? "bg-primary/10 text-primary shadow-sm"
                          : "text-muted-foreground hover:text-foreground"
                      )}
                    >
                      <Building2 className="h-4 w-4" />
                      Văn phòng
                    </button>
                  </div>


                </div>

                {/* Right Column: Map (on Desktop, stacked below on Mobile) */}
                <div
                  className="
                    order-3 relative h-[260px] md:order-none md:h-full md:min-h-[360px] overflow-hidden
                    rounded-sm bg-card border-0 shadow-sm flex flex-col
                  "
                >
                  <OsmMap
                    squareControls
                    initialLat={coordinates.lat}
                    initialLng={coordinates.lng}
                    onCurrentLocationLoadingChange={setIsRequestingCurrentLocation}
                    onCurrentLocationResolved={(lat, lng) => {
                      setHasConfirmedAddressMapping(false);
                      setAddressMappingError(null);
                      setValue(
                        "mapCoordinates",
                        { lat, lng },
                        { shouldDirty: true, shouldValidate: true }
                      );
                      setHasCurrentLocationPermission(true);
                      setCurrentLocationError(null);
                      setHasConfirmedExactLocation(false);
                      setExactLocationError(null);
                    }}
                    onCurrentLocationError={(message) => {
                      setHasCurrentLocationPermission(false);
                      setCurrentLocationError(message);
                    }}
                    onLocationChange={async (lat, lng, source) => {
                      if (source === "drag") {
                        setHasConfirmedExactLocation(true);
                        setExactLocationError(null);
                        setHasConfirmedAddressMapping(false);
                        setAddressMappingError(null);
                      }
                      const requestId = reverseRequestRef.current + 1;
                      reverseRequestRef.current = requestId;
                      setManualGeocodeLocation(null);
                      setIsReverseGeocoding(true);
                      setValue(
                        "mapCoordinates",
                        { lat, lng },
                        {
                          shouldDirty: true,
                        }
                      );

                      try {
                        const res = await fetch(`/api/locations/reverse?lat=${lat}&lng=${lng}`);
                        const result = await res.json();
                        if (requestId !== reverseRequestRef.current) return;
                        if (result?.success && result?.data) {
                          const { province, district, ward, wardName } = result.data;

                          if (province && district && (ward || wardName)) {
                            const matchedWard = ward || {
                              location_id: "0",
                              name: wardName || "",
                              parent_id: district.location_id,
                              level: 2,
                            };

                            clearStreetWhenWardChanges(matchedWard.location_id);

                            setValue(
                              "location",
                              {
                                province,
                                district,
                                ward: matchedWard,
                              },
                              { shouldDirty: true, shouldValidate: false }
                            );
                          } else {
                            clearStreetWhenWardChanges(undefined);
                            setValue(
                              "location",
                              {
                                province: undefined,
                                district: undefined,
                                ward: undefined,
                              },
                              { shouldDirty: true, shouldValidate: false }
                            );
                          }
                        } else {
                          clearStreetWhenWardChanges(undefined);
                          setValue(
                            "location",
                            {
                              province: undefined,
                              district: undefined,
                              ward: undefined,
                            },
                            { shouldDirty: true, shouldValidate: false }
                          );
                        }
                      } catch (error) {
                        if (requestId === reverseRequestRef.current) {
                          console.error("MongoDB reverse geocoding error:", error);
                          toast.error("Không thể cập nhật địa chỉ từ vị trí bản đồ");
                        }
                      } finally {
                        if (requestId === reverseRequestRef.current) {
                          setIsReverseGeocoding(false);
                        }
                      }
                    }}
                    className="relative h-full w-full flex-1 min-h-[220px] rounded-none"
                  />

                  <div className="pointer-events-none absolute bottom-2 left-2 z-10 border bg-background/90 px-2 py-1 text-[10px] tabular-nums text-muted-foreground backdrop-blur-sm">
                    {geocodeQuery.isFetching
                      ? "Đang tìm vị trí phường / xã…"
                      : isReverseGeocoding
                        ? "Đang cập nhật địa chỉ từ bản đồ…"
                        : coordinates.lat != null && coordinates.lng != null
                          ? hasConfirmedExactLocation
                            ? `Đã xác nhận • ${coordinates.lat.toFixed(6)}, ${coordinates.lng.toFixed(6)}`
                            : "Vị trí ước tính • Hãy kéo bản đồ"
                          : "Di chuyển bản đồ để chọn vị trí chính xác"}
                  </div>

                  {isLocationBusy && (
                    <>
                      <div className="absolute inset-0 z-[25] cursor-wait bg-background/60 backdrop-blur-[1px]" />
                      <div className="pointer-events-none absolute inset-x-0 top-[76px] z-30 flex justify-center px-3">
                        <div className="flex items-center gap-2 border border-black/5 bg-background/95 px-3 py-2 text-xs font-semibold text-foreground shadow-[0_4px_16px_rgba(0,0,0,0.12)] backdrop-blur-sm">
                          <Loader2 className="h-4 w-4 animate-spin text-[#00a859]" />
                          {isRequestingCurrentLocation
                            ? "Đang lấy vị trí hiện tại…"
                            : geocodeQuery.isFetching
                              ? "Đang định vị trên bản đồ…"
                              : "Đang nhận diện địa chỉ…"}
                        </div>
                      </div>
                    </>
                  )}

                  {!isLocationBusy && currentLocationError && !editingId && (
                    <div className="pointer-events-none absolute inset-x-3 top-[76px] z-30 border border-destructive/30 bg-background/95 px-3 py-2 text-xs font-medium text-destructive shadow-[0_4px_16px_rgba(0,0,0,0.10)] backdrop-blur-sm">
                      {currentLocationError}
                    </div>
                  )}

                  {!isLocationBusy && !currentLocationError && !hasConfirmedExactLocation && coordinates.lat != null && coordinates.lng != null && (
                    <div className="pointer-events-none absolute inset-x-3 top-[76px] z-30 flex items-start gap-2 border border-amber-300 bg-amber-50/95 px-3 py-2 text-xs font-semibold text-amber-950 shadow-[0_4px_16px_rgba(0,0,0,0.10)] backdrop-blur-sm">
                      <Move className="mt-0.5 h-4 w-4 shrink-0" />
                      <span>{exactLocationError || "Kéo bản đồ để xác nhận vị trí giao hàng chính xác."}</span>
                    </div>
                  )}

                </div>
              </div>
            </div>

            <div
              className="
                shrink-0 border-t border-border/40
                bg-background/80 p-4 backdrop-blur-xl
              "
            >
              <div
                role="textbox"
                aria-label="Địa chỉ được ghim trên bản đồ"
                aria-readonly="true"
                aria-hidden={!hasConfirmedExactLocation}
                className={cn(
                  "mb-2 flex min-w-0 items-start gap-2 bg-secondary/35 px-3 py-2",
                  !hasConfirmedExactLocation && "invisible"
                )}
              >
                <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold text-foreground">
                    {streetAddress?.trim() || "Nhập số nhà, tên đường để kiểm tra"}
                  </p>
                  <p className="mt-0.5 truncate text-xs text-muted-foreground">
                    {mappedAdministrativeAddress || "Chưa chọn phường và tỉnh"}
                  </p>
                </div>
              </div>

              <div
                className={cn(
                  "grid gap-2",
                  hasConfirmedExactLocation &&
                  "grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)]"
                )}
              >
                {hasConfirmedExactLocation && (
                  <button
                    type="button"
                    aria-pressed={hasConfirmedAddressMapping}
                    disabled={!canConfirmAddressMapping}
                    onClick={() => {
                      setHasConfirmedAddressMapping((confirmed) => !confirmed);
                      setAddressMappingError(null);
                    }}
                    className={cn(
                      "flex h-12 min-w-0 items-center justify-center gap-2 px-2 text-sm font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-40",
                      hasConfirmedAddressMapping
                        ? "bg-emerald-600 text-white"
                        : "bg-secondary text-foreground hover:bg-secondary/80"
                    )}
                  >
                    <span
                      className={cn(
                        "flex h-5 w-5 shrink-0 items-center justify-center border",
                        hasConfirmedAddressMapping
                          ? "border-white bg-white text-emerald-600"
                          : "border-muted-foreground/40 bg-background"
                      )}
                    >
                      {hasConfirmedAddressMapping && <Check className="h-3.5 w-3.5" />}
                    </span>
                    <span className="truncate">Xác nhận địa chỉ khớp bản đồ</span>
                  </button>
                )}

                <Button
                  type="submit"
                  onClick={(e) => e.stopPropagation()}
                  className="
                    h-12 min-w-0 w-full rounded-none border-0 px-2
                    bg-primary text-primary-foreground font-semibold text-sm
                    hover:opacity-95 active:scale-[0.99] shadow-sm transition-all
                    disabled:opacity-40 disabled:cursor-not-allowed disabled:pointer-events-none
                  "
                  disabled={saveMutation.isPending || isLocationBusy || needsCurrentLocation || !hasConfirmedExactLocation || !hasConfirmedAddressMapping}
                >
                  {saveMutation.isPending || isLocationBusy ? (
                    <Loader2 className="mr-2 h-4 w-4 shrink-0 animate-spin" />
                  ) : needsCurrentLocation ? (
                    <LocateFixed className="mr-2 h-4 w-4 shrink-0" />
                  ) : !hasConfirmedExactLocation ? (
                    <Move className="mr-2 h-4 w-4 shrink-0" />
                  ) : (
                    <Check className="mr-2 h-4 w-4 shrink-0" />
                  )}

                  <span className="truncate">
                    {isLocationBusy
                      ? isRequestingCurrentLocation
                        ? "Đang lấy vị trí hiện tại…"
                        : geocodeQuery.isFetching
                          ? "Đang định vị địa chỉ…"
                          : "Đang cập nhật vị trí…"
                      : needsCurrentLocation
                        ? "Lấy vị trí hiện tại để tiếp tục"
                        : !hasConfirmedExactLocation
                          ? "Kéo bản đồ để xác nhận vị trí"
                          : editingId
                            ? "Lưu thay đổi"
                            : "Lưu địa chỉ"}
                  </span>
                </Button>
              </div>

              {addressMappingError && (
                <p className="mt-2 text-xs font-medium text-destructive">
                  {addressMappingError}
                </p>
              )}
            </div>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
