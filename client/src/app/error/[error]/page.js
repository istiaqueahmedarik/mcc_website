import { notFound } from "next/navigation";

export default async function ErrorPage({ params, searchParams }) {
    const errorMsg = decodeURIComponent((await params).error || "Unknown error");
    if (!params.error) return notFound();
    return (
        <div className="flex min-h-screen items-center justify-center">
            <div className="bg-white p-8 rounded shadow max-w-md w-full text-center">
                <h1 className="text-2xl font-bold mb-4 text-red-600">Error</h1>
                <p className="text-gray-800 mb-2">{errorMsg}</p>
            </div>
        </div>
    );
}
