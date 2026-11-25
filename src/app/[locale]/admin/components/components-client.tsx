"use client"

import Link from "next/link"
import { useLocale } from "next-intl"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { Edit, Plus, Trash } from "lucide-react"
import { homepageMediaNames } from "@/lib/homepage-media"

type ComponentType = {
  id: string
  code: string
  name: string
  type: string
  isActive: boolean
  createdAt: string
  updatedAt: string
}

export function ComponentsClient() {
  const queryClient = useQueryClient()
  const locale = useLocale()
  const componentPath = `/${locale}/admin/components`

  const { data: components, isPending, isError, refetch } = useQuery({
    queryKey: ["admin-components"],
    queryFn: async ({ signal }) => {
      const res = await fetch("/api/admin/components", { signal })
      if (!res.ok) throw new Error("Failed to fetch components")
      return res.json() as Promise<ComponentType[]>
    },
    staleTime: 30_000,
    refetchOnWindowFocus: false,
  })

  const deleteMutation = useMutation({
    mutationFn: async (code: string) => {
      const res = await fetch(`/api/admin/components/${encodeURIComponent(code)}`, {
        method: "DELETE",
      })
      if (!res.ok) throw new Error("Failed to delete")
      return true
    },
    onSuccess: (_, code) => {
      queryClient.removeQueries({ queryKey: ["admin-components", code], exact: true })
      void queryClient.invalidateQueries({ queryKey: ["admin-components"], exact: true })
    },
  })

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <Button render={<Link href={`${componentPath}/new`} />} className="h-9 rounded-none">
          <Plus className="size-4" /> Create Component
        </Button>
        {components && Object.entries(homepageMediaNames).map(([code, name]) => {
          const configured = components.some((component) => component.code === code)
          return (
            <Button key={code} variant="outline" className="h-9 rounded-none"
              render={<Link href={`${componentPath}/${configured ? code : `new?type=${code}`}`} />}>
              {name}
            </Button>
          )
        })}
      </div>
      {isError && (
        <div role="alert" className="flex items-center gap-3 text-sm text-destructive">
          <p>Failed to load components.</p>
          <Button type="button" variant="outline" size="sm" onClick={() => void refetch()}>Retry</Button>
        </div>
      )}
      {deleteMutation.isError && <p role="alert" className="text-sm text-destructive">{deleteMutation.error.message}</p>}
      <div className="overflow-x-auto rounded-none border bg-card">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b bg-muted/50 text-left text-xs uppercase text-muted-foreground">
              <th className="p-3 font-medium">Name</th>
              <th className="p-3 font-medium">Code</th>
              <th className="p-3 font-medium">Type</th>
              <th className="p-3 font-medium">Status</th>
              <th className="p-3 font-medium text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {isPending ? (
              <tr aria-busy="true">
                <td colSpan={5} className="p-3">
                  <div role="status" aria-label="Loading components" className="space-y-2">
                    <Skeleton className="h-9 rounded-none" />
                    <Skeleton className="h-9 rounded-none" />
                    <Skeleton className="h-9 rounded-none" />
                  </div>
                </td>
              </tr>
            ) : components?.length === 0 ? (
              <tr>
                <td colSpan={5} className="p-8 text-center text-muted-foreground">
                  No dynamic components found.
                </td>
              </tr>
            ) : (
              components?.map((comp) => (
                <tr key={comp.id} className="border-b last:border-0 hover:bg-muted/30">
                  <td className="p-3 font-medium">{comp.name}</td>
                  <td className="p-3 text-muted-foreground font-mono text-xs">{comp.code}</td>
                  <td className="p-3">
                    <span className="inline-flex items-center border px-2 py-0.5 text-xs font-semibold bg-primary/5 text-primary uppercase">
                      {comp.type}
                    </span>
                  </td>
                  <td className="p-3">
                    {comp.isActive ? (
                      <span className="text-green-600 font-medium text-xs">Active</span>
                    ) : (
                      <span className="text-muted-foreground font-medium text-xs">Inactive</span>
                    )}
                  </td>
                  <td className="p-3 text-right">
                    <div className="flex justify-end gap-2">
                      <Button variant="ghost" size="icon" aria-label={`Edit ${comp.name}`} className="h-8 w-8 text-muted-foreground hover:text-foreground"
                        render={<Link href={`${componentPath}/${encodeURIComponent(comp.code)}`} />}>
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        aria-label={`Delete ${comp.name}`}
                        disabled={deleteMutation.isPending}
                        className="h-8 w-8 text-destructive hover:bg-destructive/10"
                        onClick={() => {
                          if (confirm(`Delete component ${comp.code}?`)) {
                            deleteMutation.mutate(comp.code)
                          }
                        }}
                      >
                        <Trash className="h-4 w-4" />
                      </Button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
