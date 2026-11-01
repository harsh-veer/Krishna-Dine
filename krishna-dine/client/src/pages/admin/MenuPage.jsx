import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import toast from 'react-hot-toast';
import { FolderPlus, ImagePlus, Pencil, Plus, Search, Trash2, UtensilsCrossed, X } from 'lucide-react';
import { PageHeader } from '../../layouts/AdminLayout';
import { Button, ConfirmDialog, EmptyState, Field, Input, Modal, Select, Spinner, Tabs, Textarea, Toggle, Badge } from '../../components/ui';
import FoodImage from '../../components/FoodImage';
import VegMark from '../../components/VegMark';
import { menuApi } from '../../services/endpoints';
import { errorMessage } from '../../services/api';
import { formatINR } from '../../utils/format';

const itemSchema = z.object({
  name: z.string().trim().min(1, 'Name is required').max(100),
  description: z.string().trim().max(500),
  category: z.string().min(1, 'Choose a category'),
  price: z.coerce.number({ message: 'Enter a price' }).min(0, 'Price cannot be negative').max(100000),
  preparationTime: z.coerce.number().int().min(0).max(240),
  isVegetarian: z.boolean(),
  isAvailable: z.boolean(),
  image: z.string(),
});

const catSchema = z.object({
  name: z.string().trim().min(1, 'Name is required').max(60),
  description: z.string().trim().max(300),
  displayOrder: z.coerce.number().int().min(0).max(1000),
  isActive: z.boolean(),
});

export default function MenuPage() {
  const [tab, setTab] = useState('items');
  const [data, setData] = useState(null);
  const [categories, setCategories] = useState([]);
  const [q, setQ] = useState('');
  const [catFilter, setCatFilter] = useState('');
  const [editing, setEditing] = useState(null); // item object or {} for new
  const [editingCat, setEditingCat] = useState(null);
  const [deleting, setDeleting] = useState(null);

  const load = useCallback(async () => {
    try {
      const [m, c] = await Promise.all([menuApi.list(), menuApi.categories()]);
      setData(m);
      setCategories(c);
    } catch (e) {
      toast.error(errorMessage(e));
    }
  }, []);
  useEffect(() => {
    load();
  }, [load]);

  const items = useMemo(
    () => (data?.items || []).filter((i) => (!catFilter || i.category === catFilter) && (!q || i.name.toLowerCase().includes(q.toLowerCase()))),
    [data, q, catFilter]
  );

  const toggleAvailability = async (item, value) => {
    try {
      await menuApi.setAvailability(item.id, value);
      setData((d) => ({ ...d, items: d.items.map((i) => (i.id === item.id ? { ...i, isAvailable: value } : i)) }));
    } catch (e) {
      toast.error(errorMessage(e));
    }
  };

  const confirmDelete = async () => {
    try {
      if (deleting.type === 'item') await menuApi.remove(deleting.value.id);
      else await menuApi.removeCategory(deleting.value.id);
      toast.success(`${deleting.value.name} deleted`);
      setDeleting(null);
      load();
    } catch (e) {
      toast.error(errorMessage(e));
    }
  };

  return (
    <>
      <PageHeader
        title="Menu"
        description="Changes appear on customer phones instantly."
        actions={
          tab === 'items' ? (
            <Button icon={Plus} onClick={() => setEditing({})} data-testid="add-item">Add food item</Button>
          ) : (
            <Button icon={FolderPlus} onClick={() => setEditingCat({})}>Add category</Button>
          )
        }
      />
      <Tabs className="mb-4 w-fit" value={tab} onChange={setTab} tabs={[{ value: 'items', label: 'Food items', count: data?.items.length }, { value: 'categories', label: 'Categories', count: categories.length }]} />

      {!data ? (
        <Spinner />
      ) : tab === 'items' ? (
        <>
          <div className="card mb-4 flex flex-wrap gap-3 p-4">
            <label className="relative min-w-[200px] flex-1">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-brand-900/40" />
              <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search items" className="pl-9" />
            </label>
            <Select value={catFilter} onChange={(e) => setCatFilter(e.target.value)} className="w-auto min-w-[180px]">
              <option value="">All categories</option>
              {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </Select>
          </div>
          {items.length === 0 ? (
            <EmptyState icon={UtensilsCrossed} title="No items" message="Add your first dish to start taking orders." />
          ) : (
            <div className="card overflow-x-auto">
              <table className="w-full min-w-[720px] text-sm">
                <thead className="bg-cream-100 text-left text-xs font-bold uppercase tracking-wider text-brand-900/50">
                  <tr><th className="px-5 py-3">Item</th><th className="px-3 py-3">Category</th><th className="px-3 py-3 text-right">Price</th><th className="px-3 py-3">Available</th><th className="px-5 py-3 text-right">Actions</th></tr>
                </thead>
                <tbody className="divide-y divide-cream-200">
                  {items.map((i) => (
                    <tr key={i.id} className="hover:bg-cream-50">
                      <td className="px-5 py-3">
                        <div className="flex items-center gap-3">
                          <FoodImage src={i.image} name={i.name} category={i.categoryName} className="h-12 w-12 shrink-0 rounded-xl" />
                          <div className="min-w-0">
                            <div className="flex items-center gap-2 font-semibold"><VegMark veg={i.isVegetarian} /> {i.name}</div>
                            <div className="line-clamp-1 max-w-xs text-xs text-brand-900/50">{i.description}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-3 py-3">{i.categoryName}</td>
                      <td className="px-3 py-3 text-right font-semibold tabular-nums">{formatINR(i.price)}</td>
                      <td className="px-3 py-3"><Toggle checked={i.isAvailable} onChange={(v) => toggleAvailability(i, v)} label={`${i.name} available`} size="sm" /></td>
                      <td className="px-5 py-3 text-right">
                        <Button variant="ghost" size="sm" icon={Pencil} onClick={() => setEditing(i)}>Edit</Button>
                        <Button variant="danger-ghost" size="sm" icon={Trash2} onClick={() => setDeleting({ type: 'item', value: i })} aria-label={`Delete ${i.name}`} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {categories.map((c) => (
            <div key={c.id} className="card p-5">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="text-xs font-semibold text-brand-900/40">#{c.displayOrder}</div>
                  <h3 className="font-bold">{c.name}</h3>
                  <p className="mt-0.5 text-sm text-brand-900/60">{c.description || 'No description'}</p>
                </div>
                {c.isActive ? <Badge tone="green">Visible</Badge> : <Badge tone="slate">Hidden</Badge>}
              </div>
              <div className="mt-4 flex items-center justify-between">
                <span className="text-sm text-brand-900/60">{c.itemCount} items</span>
                <div>
                  <Button variant="ghost" size="sm" icon={Pencil} onClick={() => setEditingCat(c)}>Edit</Button>
                  <Button variant="danger-ghost" size="sm" icon={Trash2} onClick={() => setDeleting({ type: 'category', value: c })} aria-label={`Delete ${c.name}`} />
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {editing && <ItemModal item={editing} categories={categories} onClose={() => setEditing(null)} onSaved={() => { setEditing(null); load(); }} />}
      {editingCat && <CategoryModal category={editingCat} onClose={() => setEditingCat(null)} onSaved={() => { setEditingCat(null); load(); }} />}
      <ConfirmDialog
        open={Boolean(deleting)}
        onClose={() => setDeleting(null)}
        onConfirm={confirmDelete}
        danger
        title={`Delete ${deleting?.value.name}?`}
        message={deleting?.type === 'item' ? 'The item is removed from the menu. Past orders and bills keep their original name and price.' : 'Only empty categories can be deleted. To keep items but hide them, mark the category hidden instead.'}
        confirmLabel="Delete"
      />
    </>
  );
}

function ItemModal({ item, categories, onClose, onSaved }) {
  const isNew = !item.id;
  const fileRef = useRef(null);
  const [uploading, setUploading] = useState(false);
  const { register, handleSubmit, control, formState, setValue, watch } = useForm({
    resolver: zodResolver(itemSchema),
    defaultValues: {
      name: item.name || '',
      description: item.description || '',
      category: item.category || categories[0]?.id || '',
      price: item.price ?? '',
      preparationTime: item.preparationTime ?? 15,
      isVegetarian: item.isVegetarian ?? true,
      isAvailable: item.isAvailable ?? true,
      image: item.image || '',
    },
  });
  const image = watch('image');
  const name = watch('name');
  const catName = categories.find((c) => c.id === watch('category'))?.name;

  const upload = async (file) => {
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) return toast.error('Image must be under 2 MB');
    setUploading(true);
    try {
      const res = await menuApi.upload(file);
      setValue('image', res.url, { shouldDirty: true });
    } catch (e) {
      toast.error(errorMessage(e));
    } finally {
      setUploading(false);
    }
    return undefined;
  };

  const onSubmit = handleSubmit(async (values) => {
    try {
      if (isNew) await menuApi.create(values);
      else await menuApi.update(item.id, values);
      toast.success(isNew ? 'Item added' : 'Item updated');
      onSaved();
    } catch (e) {
      toast.error(errorMessage(e));
    }
  });

  const err = formState.errors;
  return (
    <Modal
      open
      onClose={onClose}
      title={isNew ? 'Add food item' : `Edit ${item.name}`}
      size="lg"
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>Cancel</Button>
          <Button onClick={onSubmit} loading={formState.isSubmitting} data-testid="save-item">{isNew ? 'Add item' : 'Save changes'}</Button>
        </>
      }
    >
      <form onSubmit={onSubmit} className="grid gap-4 sm:grid-cols-[180px_1fr]">
        <div>
          <div className="relative">
            <FoodImage src={image} name={name || 'New item'} category={catName} className="aspect-square w-full rounded-2xl" />
            {image && (
              <button type="button" onClick={() => setValue('image', '', { shouldDirty: true })} className="absolute right-2 top-2 rounded-lg bg-white/90 p-1.5 shadow" aria-label="Remove image">
                <X className="h-4 w-4" />
              </button>
            )}
          </div>
          <input ref={fileRef} type="file" accept="image/jpeg,image/png,image/webp" className="hidden" onChange={(e) => upload(e.target.files?.[0])} />
          <Button variant="secondary" size="sm" className="mt-2 w-full" icon={ImagePlus} loading={uploading} onClick={() => fileRef.current?.click()}>Upload photo</Button>
          <p className="mt-1 text-center text-[11px] text-brand-900/45">JPG, PNG or WebP, max 2 MB</p>
        </div>
        <div className="space-y-4">
          <Field label="Name" error={err.name?.message}><Input {...register('name')} placeholder="Paneer Tikka" /></Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Price (₹)" error={err.price?.message}><Input type="number" step="0.01" min="0" inputMode="decimal" {...register('price')} /></Field>
            <Field label="Prep time (min)" error={err.preparationTime?.message}><Input type="number" min="0" {...register('preparationTime')} /></Field>
          </div>
          <Field label="Category" error={err.category?.message}>
            <Select {...register('category')}>
              {categories.map((c) => <option key={c.id} value={c.id}>{c.name}{c.isActive ? '' : ' (hidden)'}</option>)}
            </Select>
          </Field>
          <Field label="Description" error={err.description?.message}><Textarea {...register('description')} maxLength={500} /></Field>
          <div className="flex flex-wrap gap-6">
            <Controller name="isVegetarian" control={control} render={({ field }) => (
              <label className="flex items-center gap-2.5 text-sm font-semibold"><Toggle checked={field.value} onChange={field.onChange} label="Vegetarian" /> Vegetarian</label>
            )} />
            <Controller name="isAvailable" control={control} render={({ field }) => (
              <label className="flex items-center gap-2.5 text-sm font-semibold"><Toggle checked={field.value} onChange={field.onChange} label="Available" /> Available now</label>
            )} />
          </div>
        </div>
      </form>
    </Modal>
  );
}

function CategoryModal({ category, onClose, onSaved }) {
  const isNew = !category.id;
  const { register, handleSubmit, control, formState } = useForm({
    resolver: zodResolver(catSchema),
    defaultValues: { name: category.name || '', description: category.description || '', displayOrder: category.displayOrder ?? 10, isActive: category.isActive ?? true },
  });
  const onSubmit = handleSubmit(async (values) => {
    try {
      if (isNew) await menuApi.createCategory(values);
      else await menuApi.updateCategory(category.id, values);
      toast.success('Category saved');
      onSaved();
    } catch (e) {
      toast.error(errorMessage(e));
    }
  });
  return (
    <Modal open onClose={onClose} title={isNew ? 'Add category' : `Edit ${category.name}`} size="sm" footer={<><Button variant="secondary" onClick={onClose}>Cancel</Button><Button onClick={onSubmit} loading={formState.isSubmitting}>Save</Button></>}>
      <form onSubmit={onSubmit} className="space-y-4">
        <Field label="Name" error={formState.errors.name?.message}><Input {...register('name')} /></Field>
        <Field label="Description"><Textarea {...register('description')} /></Field>
        <Field label="Display order" hint="Lower numbers appear first"><Input type="number" {...register('displayOrder')} /></Field>
        <Controller name="isActive" control={control} render={({ field }) => (
          <label className="flex items-center gap-2.5 text-sm font-semibold"><Toggle checked={field.value} onChange={field.onChange} label="Visible" /> Visible to customers</label>
        )} />
      </form>
    </Modal>
  );
}
