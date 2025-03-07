"use client"

import { Button } from "@/components/ui/button"
import { ChevronLeft, ChevronRight } from "lucide-react"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"


export function PaginationControls({
    currentPage,
    totalPages,
    pageSize,
    totalItems,
    onPageChange,
    onPageSizeChange,
}) {
    return (
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 py-4">
            <div className="text-sm text-muted-foreground">
                Showing {Math.min((currentPage - 1) * pageSize + 1, totalItems)} to{" "}
                {Math.min(currentPage * pageSize, totalItems)} of {totalItems} items
            </div>

            <div className="flex items-center space-x-2">
                <div className="flex items-center mr-4">
                    <span className="text-sm text-muted-foreground mr-2">Items per page</span>
                    <Select value={pageSize.toString()} onValueChange={(value) => onPageSizeChange(Number.parseInt(value))}>
                        <SelectTrigger className="h-8 w-16">
                            <SelectValue placeholder={pageSize.toString()} />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="5">5</SelectItem>
                            <SelectItem value="10">10</SelectItem>
                            <SelectItem value="20">20</SelectItem>
                            <SelectItem value="50">50</SelectItem>
                        </SelectContent>
                    </Select>
                </div>

                <Button
                    variant="outline"
                    size="icon"
                    onClick={() => onPageChange(currentPage - 1)}
                    disabled={currentPage === 1}
                    className="h-8 w-8"
                >
                    <ChevronLeft className="h-4 w-4" />
                    <span className="sr-only">Previous page</span>
                </Button>

                <div className="text-sm font-medium">
                    Page {currentPage} of {totalPages}
                </div>

                <Button
                    variant="outline"
                    size="icon"
                    onClick={() => onPageChange(currentPage + 1)}
                    disabled={currentPage === totalPages || totalPages === 0}
                    className="h-8 w-8"
                >
                    <ChevronRight className="h-4 w-4" />
                    <span className="sr-only">Next page</span>
                </Button>
            </div>
        </div>
    )
}

