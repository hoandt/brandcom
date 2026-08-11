import { NextResponse } from 'next/server';
import { checkSPXShippingFee, SPXOrder } from '@/lib/shipping/spx';
import { prisma } from '@/lib/prisma';
import { getStoreSettings } from '@/lib/store-settings';
import { getSPXSettings, SPX_CARRIER } from '@/lib/shipping/settings';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { location, items, recipient, isCod, codAmount, carrier } = body;

    if (carrier && carrier !== SPX_CARRIER) {
      return NextResponse.json({ error: 'Unsupported shipping carrier' }, { status: 400 });
    }
    const locationName = (value: unknown) =>
      typeof value === 'string'
        ? value.trim()
        : (value as { name?: unknown } | null | undefined)?.name &&
            typeof (value as { name?: unknown }).name === 'string'
          ? ((value as { name: string }).name).trim()
          : '';
    const destination = {
      province: locationName(location?.province),
      district: locationName(location?.district),
      ward: locationName(location?.ward),
    };

    if (!destination.province || !destination.district || !destination.ward) {
      return NextResponse.json(
        { error: 'Incomplete destination address' },
        { status: 400 }
      );
    }

    if (!Array.isArray(items) || items.length === 0 || items.some((item) => !Number.isFinite(item?.quantity) || item.quantity <= 0)) {
      return NextResponse.json(
        { error: 'Cart items are invalid' },
        { status: 400 }
      );
    }

    const [storeSettings, carrierSettings] = await Promise.all([
      getStoreSettings(),
      getSPXSettings(),
    ]);

    if (!carrierSettings.enabled) {
      return NextResponse.json(
        {
          error: 'SPX shipping is disabled',
          carrier: SPX_CARRIER,
          fallbackFee: storeSettings.fallbackShippingFee,
        },
        { status: 503 }
      );
    }

    // Default sender location (Your store location)
    // SPX requires exact valid Province, District, and Ward names.
    const warehouse = await prisma.warehouse.findFirst({
      where: { isDefault: true, isActive: true, isPickup: true },
    });
    const senderProvince = warehouse?.spxProvince || warehouse?.provinceName || process.env.SPX_SENDER_STATE || 'TP. Hồ Chí Minh';
    const senderDistrict = warehouse?.spxDistrict || warehouse?.districtName || process.env.SPX_SENDER_CITY || 'Quận 1';
    const senderWard = warehouse?.spxWard || warehouse?.wardName || process.env.SPX_SENDER_DISTRICT || 'Phường Bến Nghé';
    const senderDetailAddress = warehouse?.address || process.env.SPX_SENDER_DETAIL_ADDRESS || senderWard;

    const totalQuantity = items.reduce((acc: number, item: { quantity?: number }) => acc + (item.quantity || 1), 0);
    const parcelWeight = Math.max(
      carrierSettings.minimumParcelWeight,
      totalQuantity * carrierSettings.parcelWeightPerItem
    );

    const sanitizeSPXLocation = (name: string) => {
      if (!name) return '';
      if (name.toLowerCase() === 'thành phố hồ chí minh' || name.toLowerCase() === 'tp hồ chí minh' || name.toLowerCase() === 'ho chi minh') {
        return 'TP. Hồ Chí Minh';
      }
      return name;
    };

    let spxProvince = sanitizeSPXLocation(destination.province);
    let spxDistrict = sanitizeSPXLocation(destination.district);
    let spxWard = destination.ward;

    // Server-side secret location mapping resolution (never exposed to FE)
    const wardId = location?.wardId || (typeof location?.ward === "object" ? location?.ward?.location_id : null);
    const provinceId = location?.provinceId || (typeof location?.province === "object" ? location?.province?.location_id : null);

    if (wardId) {
      try {
        const lookupPid = provinceId || wardId;
        const lookupRes = await fetch(
          `https://app.swifthub.net/api/swifthub/locations?country=VN&parent_id=${encodeURIComponent(lookupPid)}`,
          { next: { revalidate: 24 * 3600 } }
        );
        if (lookupRes.ok) {
          const lookupJson = await lookupRes.json();
          const items = Array.isArray(lookupJson.data) ? lookupJson.data : Array.isArray(lookupJson) ? lookupJson : [];
          const found = items.find((item: any) => item.location_id === wardId);
          const mappings = found?.shipping_mappings?.spx;
          const resolved = Array.isArray(mappings) ? mappings[0] : mappings;
          if (resolved?.province && resolved?.district && resolved?.ward) {
            spxProvince = sanitizeSPXLocation(resolved.province);
            spxDistrict = sanitizeSPXLocation(resolved.district);
            spxWard = resolved.ward;
          }
        }
      } catch (err) {
        console.warn("Server-side SPX location mapping resolution fallback:", err);
      }
    }

    if (spxDistrict.toLowerCase().includes('thủ đức')) spxDistrict = 'Thành Phố Thủ Đức';

    const order: Omit<SPXOrder, 'user_id' | 'user_secret'> = {
      order_id: '1',
      base_info: {
        service_type: carrierSettings.serviceType,
      },
      fulfillment_info: {
        payment_role: carrierSettings.paymentRole,
        ...(isCod ? {
          cod_collection: carrierSettings.codCollection,
          cod_amount: codAmount > 0 ? codAmount : carrierSettings.defaultCodAmount,
        } : {
          cod_collection: 0,
        }),
        high_value_processing_collection: carrierSettings.highValueProcessingCollection,
        collect_type: carrierSettings.collectType,
        allow_mutual_check: carrierSettings.allowMutualCheck,
        allow_try_on: carrierSettings.allowTryOn,
        ...(carrierSettings.collectType === 1
          ? { pickup_time: Math.floor(Date.now() / 1000) + carrierSettings.pickupLeadTimeMinutes * 60 }
          : {}),
        ...(carrierSettings.pickupTimeRangeId != null
          ? { pickup_time_range_id: carrierSettings.pickupTimeRangeId }
          : {}),
        ...(carrierSettings.voucherCode
          ? { voucher_code: carrierSettings.voucherCode }
          : {}),
      },
      sender_info: {
        sender_country: carrierSettings.senderCountry,
        sender_state: senderProvince,
        sender_city: senderDistrict,
        sender_district: senderWard,
        sender_detail_address: senderDetailAddress,
        ...(warehouse?.contactName || carrierSettings.senderName
          ? { sender_name: warehouse?.contactName || carrierSettings.senderName || undefined }
          : {}),
        ...(warehouse?.phone || carrierSettings.senderPhone
          ? { sender_phone: warehouse?.phone || carrierSettings.senderPhone || undefined }
          : {}),
        ...(process.env.SPX_SENDER_POST_CODE
          ? { sender_post_code: process.env.SPX_SENDER_POST_CODE }
          : {}),
        ...((warehouse?.longitude != null && warehouse?.latitude != null) ||
        (process.env.SPX_SENDER_LONGITUDE && process.env.SPX_SENDER_LATITUDE)
          ? {
              sender_longitude: warehouse?.longitude?.toString() || process.env.SPX_SENDER_LONGITUDE,
              sender_latitude: warehouse?.latitude?.toString() || process.env.SPX_SENDER_LATITUDE,
            }
          : {}),
      },
      deliver_info: {
        deliver_country: carrierSettings.senderCountry,
        deliver_state: spxProvince,
        deliver_city: spxDistrict,
        deliver_district: spxWard,
        deliver_detail_address:
          typeof location.detailAddress === 'string' && location.detailAddress.trim()
            ? location.detailAddress.trim()
            : destination.ward,
        ...(typeof recipient?.name === 'string' && recipient.name.trim()
          ? { deliver_name: recipient.name.trim() }
          : {}),
        ...(typeof recipient?.phone === 'string' && recipient.phone.trim()
          ? { deliver_phone: recipient.phone.trim() }
          : {}),
        ...(carrierSettings.defaultDeliverInstruction
          ? { deliver_instruction: carrierSettings.defaultDeliverInstruction }
          : {}),
      },
      parcel_info: {
        parcel_weight: parcelWeight,
        parcel_item_name: carrierSettings.parcelItemName,
        parcel_item_quantity: totalQuantity,
        parcel_length: carrierSettings.parcelLength,
        parcel_width: carrierSettings.parcelWidth,
        parcel_height: carrierSettings.parcelHeight,
        express_insured_value: carrierSettings.expressInsuredValue,
      },
      ...(carrierSettings.vasTypes.length > 0 || carrierSettings.collectFeeAmount > 0
        ? {
            vas_info: {
              vas_types: carrierSettings.vasTypes,
              collect_fee_amount: carrierSettings.collectFeeAmount,
            },
          }
        : {}),
    };

    const response = await checkSPXShippingFee([order]);

    if (response.ret_code === 0 && response.data.orders.length > 0) {
      const shippingFee = response.data.orders[0].estimated_shipping_fee;

      return NextResponse.json({
        fee: shippingFee,
        carrier: SPX_CARRIER,
        serviceType: carrierSettings.serviceType,
        parcel: {
          weight: parcelWeight,
          length: carrierSettings.parcelLength,
          width: carrierSettings.parcelWidth,
          height: carrierSettings.parcelHeight,
          itemName: carrierSettings.parcelItemName,
          itemQuantity: totalQuantity,
        },
      });
    } else {
      console.error('SPX Error Response:', JSON.stringify(response, null, 2));
      // Fallback in case SPX fails or returns fail_list
      return NextResponse.json(
        {
          error: 'Failed to calculate shipping fee',
          details: response.message,
          carrier: SPX_CARRIER,
          fallbackFee: storeSettings.fallbackShippingFee,
        },
        { status: 500 }
      );
    }
  } catch (error: unknown) {
    // Provider/network failures use the configured fallback so checkout remains usable.
    const storeSettings = await getStoreSettings().catch(() => null);
    const fallbackFee = storeSettings?.fallbackShippingFee ?? 30000;
    const message = error instanceof Error ? error.message : 'Shipping provider unavailable';
    console.warn(`Shipping calculation unavailable; using fallback fee: ${message}`);
    return NextResponse.json(
      {
        fee: fallbackFee,
        warning: 'Shipping provider unavailable; fallback fee applied',
        carrier: SPX_CARRIER,
        fallbackFee,
        isFallback: true,
      },
      { status: 200 }
    );
  }
}
