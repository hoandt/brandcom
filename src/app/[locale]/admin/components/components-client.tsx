"use client"

import { useState } from "react"
import Link from "next/link"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { Button } from "@/components/ui/button"
import { Eye, Edit, Trash } from "lucide-react"

type ComponentType = {
  id: string
  code: string
  name: string
  type: string
  isActive: boolean
  createdAt: string
  updatedAt: string
}

export function ComponentsClient({ initialComponents }: { initialComponents: ComponentType[] }) {
  const queryClient = useQueryClient()

  const { data: components, isLoading } = useQuery({
    queryKey: ["admin-components"],
    queryFn: async () => {
      const res = await fetch("/api/admin/components")
      if (!res.ok) throw new Error("Failed to fetch components")
      return res.json() as Promise<ComponentType[]>
    },
    initialData: initialComponents,
  })

  const deleteMutation = useMutation({
    mutationFn: async (code: string) => {
      const res = await fetch(`/api/admin/components/${code}`, {
        method: "DELETE",
      })
      if (!res.ok) throw new Error("Failed to delete")
      return true
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-components"] })
    },
  })

  return (
    <div className="rounded-none border bg-card">
      <div className="overflow-x-auto">
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
            {isLoading ? (
              <tr>
                <td colSpan={5} className="p-4 text-center text-muted-foreground">Loading...</td>
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
                      <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-foreground" render={<Link href={`/admin/components/${comp.code}`} />}>
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
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
