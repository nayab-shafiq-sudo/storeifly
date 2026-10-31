import React, { useEffect, useState } from "react";
import { MerchantLayout } from "../../components/MerchantLayout";
import { Plus, Trash2, FolderTree } from "lucide-react";
import { Spinner } from "../../components/common/Spinner";
import toast from "react-hot-toast";
import { api } from "../../config/api";

export const CategoriesPage: React.FC = () => {
    const [categories, setCategories] = useState<any[]>([]);
    const [name, setName] = useState("");
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);

    useEffect(() => {
        fetchCategories();
    }, []);

    const fetchCategories = async () => {
        setLoading(true);
        try {
            const storeRes = await api.get("/api/stores/me")
            if (storeRes.data.success){
                const res = await api.get(`/api/categories?storeId=${storeRes.data.store.id}`)
                if (res.data.success){
                    setCategories(res.data.categories);
                }
            }
        } catch (err) {
            console.error(err)
        } finally {
            setLoading(false)
        }
    };

    const handleCreate = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!name.trim()) return;
        setSubmitting(true);

        try {
            const res = await api.post('/api/categories', {name: name.trim()});
            if (res.data.success){
                toast.success("Category created");
                setName("")
                fetchCategories();
            }
        } catch (err:any) {
            toast.error(err.response?.data?.message || "Failed to create category")
        } finally {
            setSubmitting(false);
        }
    };

    const handleDelete = async (id: number) => {
        if (!window.confirm("Are you sure? Products in this category will become uncategorized.")) return;
        try {
            const res = await api.delete(`/api/categories/${id}`)
            if(res.data.success){
                toast.success("Category deleted")
                setCategories((prev)=> prev.filter((c) => c.id !== id))
            }
        } catch (err:any) {
            toast.error(err.response?.data?.message || "Delete failed")
        }
    };

    return (
        <MerchantLayout>
            <div className="space-y-7">
                <h1 className="text-xl sm:text-2xl text-neutral-900 mt-10">Product Categories</h1>

                <div className="bg-white p-6 rounded-3xl border border-neutral-200/80">
                    <h2 className="text-xs font-semibold text-neutral-900 uppercase tracking-wider mb-3">Create Category</h2>
                    <form onSubmit={handleCreate} className="flex flex-col sm:flex-row gap-3 max-w-lg">
                        <input
                            type="text"
                            required
                            placeholder="e.g. Specialty Beans, Drinkware..."
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            className="flex-1 px-4 py-2.5 text-xs border border-neutral-200 rounded-full focus:outline-none focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600/20 bg-neutral-50/50"
                        />
                        <button
                            type="submit"
                            disabled={submitting || !name.trim()}
                            className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold rounded-full transition disabled:opacity-50 flex items-center justify-center gap-1.5 shrink-0 cursor-pointer"
                        >
                            <Plus className="w-3.5 h-3.5" /> {submitting ? "Creating..." : "Add Category"}
                        </button>
                    </form>
                </div>

                <div className="bg-white rounded-3xl border border-neutral-200/80 overflow-hidden">
                    <div className="p-5 sm:p-6 border-b border-neutral-100 flex items-center justify-between">
                        <h2 className="font-medium text-neutral-900">Catalog Collections</h2>
                        <span className="text-xs text-neutral-400 font-mono">{categories.length} total</span>
                    </div>
                    {loading ? (
                        <Spinner padded />
                    ) : categories.length === 0 ? (
                        <p className="p-12 text-center text-xs text-neutral-400 font-mono">No categories created yet.</p>
                    ) : (
                        <div className="divide-y divide-neutral-100">
                            {categories.map((c) => (
                                <div
                                    key={c.id}
                                    className="p-4 sm:px-6 flex items-center justify-between hover:bg-neutral-50/50 transition text-xs"
                                >
                                    <div className="flex items-center gap-3.5">
                                        <div className="w-8 h-8 rounded-full bg-neutral-100 flex items-center justify-center text-neutral-600 shrink-0">
                                            <FolderTree className="w-4 h-4" />
                                        </div>
                                        <div>
                                            <h3 className="font-medium text-neutral-900 text-xs sm:text-sm">{c.name}</h3>
                                            <span className="text-[10px] text-neutral-400 font-mono">slug: {c.slug}</span>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-4">
                                        <span className="px-3 py-1 bg-neutral-100 text-neutral-600 rounded-full text-[11px] font-mono">
                                            {c.product_count || 0} products
                                        </span>
                                        <button
                                            type="button"
                                            onClick={() => handleDelete(c.id)}
                                            className="p-2 text-neutral-400 hover:text-rose-600 rounded-full hover:bg-rose-50 transition cursor-pointer"
                                            title="Delete category"
                                        >
                                            <Trash2 className="w-3.5 h-3.5" />
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </MerchantLayout>
    );
};
