'use client';

import React, { useState, useEffect } from 'react';
import Badge from '../../components/ui/Badge';
import Button from '../../components/ui/Button';
import Modal from '../../components/ui/Modal';
import Input from '../../components/ui/Input';
import {
  CheckCircle,
  Plus,
  ShieldCheck,
  RefreshCw,
  Pencil,
  Trash2,
  Eye,
  EyeOff,
  Database,
} from 'lucide-react';

const EMPTY_ITEM = {
  title: '',
  category: 'courses',
  content: '',
  priority: 5,
};

export default function KnowledgePage() {
  const [items, setItems] = useState([]);
  const [modalOpen, setModalOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editing, setEditing] = useState(null);
  const [newItem, setNewItem] = useState(EMPTY_ITEM);
  const [syncing, setSyncing] = useState(false);

  const fetchKnowledge = async () => {
    try {
      setLoading(true);

      const res = await fetch('/api/knowledge', {
        cache: 'no-store',
      });

      if (!res.ok) {
        throw new Error('Failed to load knowledge');
      }

      const data = await res.json();
      setItems(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchKnowledge();
  }, []);

  const openAdd = () => {
    setEditing(null);
    setNewItem(EMPTY_ITEM);
    setModalOpen(true);
  };

  const syncKnowledge = async () => {
  try {
    setSyncing(true);

    const res = await fetch('/api/knowledge/sync', {
      method: 'POST',
      cache: 'no-store',
    });

    const data = await res.json();

    if (!res.ok) {
      throw new Error(data.error || 'Failed to sync knowledge');
    }

    await fetchKnowledge();

    alert(`Knowledge Base synced successfully. ${data.count} published items are now available to TejBot.`);
  } catch (err) {
    console.error(err);
    alert(err.message);
  } finally {
    setSyncing(false);
  }
};

  const openEdit = (item) => {
    setEditing(item);

    setNewItem({
      title: item.title || '',
      category: item.category || 'general',
      content: item.content || '',
      priority: item.priority ?? 5,
    });

    setModalOpen(true);
  };

  const closeModal = () => {
    if (saving) return;

    setModalOpen(false);
    setEditing(null);
    setNewItem(EMPTY_ITEM);
  };

  const handleSave = async (e) => {
    e.preventDefault();

    if (!newItem.title.trim() || !newItem.content.trim()) {
      return;
    }

    try {
      setSaving(true);

      const method = editing ? 'PUT' : 'POST';

      const body = editing
        ? {
            id: editing.id,
            ...newItem,
          }
        : newItem;

      const res = await fetch('/api/knowledge', {
        method,
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(body),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(
          data.error || 'Failed to save knowledge'
        );
      }

      closeModal();
      await fetchKnowledge();
    } catch (err) {
      console.error(err);
      alert(err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (item) => {
    const confirmed = window.confirm(
      `Delete "${item.title}"?\n\nThis cannot be undone.`
    );

    if (!confirmed) return;

    try {
      const res = await fetch(
        `/api/knowledge?id=${encodeURIComponent(item.id)}`,
        {
          method: 'DELETE',
        }
      );

      const data = await res.json();

      if (!res.ok) {
        throw new Error(
          data.error || 'Failed to delete knowledge'
        );
      }

      setItems(current =>
        current.filter(x => x.id !== item.id)
      );
    } catch (err) {
      console.error(err);
      alert(err.message);
    }
  };

  const togglePublished = async (item) => {
    try {
      const res = await fetch('/api/knowledge', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          id: item.id,
          is_published: !item.is_published,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(
          data.error || 'Failed to update status'
        );
      }

      setItems(current =>
        current.map(x =>
          x.id === item.id
            ? data.item
            : x
        )
      );
    } catch (err) {
      console.error(err);
      alert(err.message);
    }
  };

  return (
    <div className="space-y-6">

      {/* HEADER */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2">
            <h1 className="text-xl font-bold text-[#111111]">
              Knowledge Base
            </h1>

            <Badge variant="brand">
              <ShieldCheck
                size={12}
                className="mr-1 inline"
              />
              Verified AI Source
            </Badge>
          </div>

          <p className="text-xs text-[#667085] mt-0.5">
            Manage the verified information TejBot can use.
          </p>
        </div>

        <div className="flex items-center space-x-2">
          <button
            onClick={fetchKnowledge}
            className="p-2 hover:bg-gray-100 rounded-lg text-[#667085]"
            title="Refresh"
          >
            <RefreshCw
              size={16}
              className={loading ? 'animate-spin' : ''}
            />
          </button>

          <Button
  variant="secondary"
  size="sm"
  onClick={syncKnowledge}
  disabled={syncing}
>
  <Database
    size={15}
    className={`mr-1.5 ${syncing ? 'animate-pulse' : ''}`}
  />
  {syncing ? 'Syncing...' : 'Sync AI Knowledge'}
</Button>

<Button
  variant="primary"
  size="sm"
  onClick={openAdd}
>
  <Plus size={15} className="mr-1.5" />
  Add Knowledge
</Button>

          <Button
            variant="primary"
            size="sm"
            onClick={openAdd}
          >
            <Plus
              size={15}
              className="mr-1.5"
            />
            Add Knowledge
          </Button>
        </div>
      </div>

      {/* EMPTY STATE */}
      {!loading && items.length === 0 && (
        <div className="bg-white border border-dashed border-[#D0D5DD] rounded-xl p-12 text-center">
          <ShieldCheck
            size={30}
            className="mx-auto text-[#98A2B3] mb-3"
          />

          <h3 className="font-semibold text-sm text-[#111111]">
            No knowledge items yet
          </h3>

          <p className="text-xs text-[#667085] mt-1">
            Add verified information for TejBot to use.
          </p>

          <div className="mt-4">
            <Button
              variant="primary"
              size="sm"
              onClick={openAdd}
            >
              <Plus
                size={15}
                className="mr-1.5"
              />
              Add Knowledge
            </Button>
          </div>
        </div>
      )}

      {/* KNOWLEDGE GRID */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

        {items.map(item => (
          <div
            key={item.id}
            className={`bg-white border rounded-xl p-5 shadow-xs flex flex-col justify-between ${
              item.is_published
                ? 'border-[#E5E7EB]'
                : 'border-dashed border-[#D0D5DD] opacity-75'
            }`}
          >
            <div>

              <div className="flex items-center justify-between mb-2">

                <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded bg-gray-100 text-gray-700">
                  {item.category}
                </span>

                {item.is_published ? (
                  <span className="text-xs text-[#63B99B] font-semibold flex items-center">
                    <CheckCircle
                      size={13}
                      className="mr-1"
                    />
                    Published
                  </span>
                ) : (
                  <span className="text-xs text-[#98A2B3] font-semibold flex items-center">
                    <EyeOff
                      size={13}
                      className="mr-1"
                    />
                    Unpublished
                  </span>
                )}

              </div>

              <h3 className="font-bold text-sm text-[#111111]">
                {item.title}
              </h3>

              <p className="text-xs text-[#667085] mt-2 leading-relaxed whitespace-pre-wrap">
                {item.content}
              </p>

            </div>

            {/* ACTION BAR */}
            <div className="mt-4 pt-3 border-t border-[#E5E7EB] flex items-center justify-between">

              <span className="text-[11px] text-[#667085]">
                Priority: {item.priority}/10
              </span>

              <div className="flex items-center gap-1">

                <button
                  onClick={() =>
                    togglePublished(item)
                  }
                  className="p-2 rounded-lg hover:bg-gray-100 text-[#667085]"
                  title={
                    item.is_published
                      ? 'Unpublish'
                      : 'Publish'
                  }
                >
                  {item.is_published ? (
                    <EyeOff size={15} />
                  ) : (
                    <Eye size={15} />
                  )}
                </button>

                <button
                  onClick={() =>
                    openEdit(item)
                  }
                  className="p-2 rounded-lg hover:bg-gray-100 text-[#667085]"
                  title="Edit"
                >
                  <Pencil size={15} />
                </button>

                <button
                  onClick={() =>
                    handleDelete(item)
                  }
                  className="p-2 rounded-lg hover:bg-red-50 text-red-500"
                  title="Delete"
                >
                  <Trash2 size={15} />
                </button>

              </div>
            </div>

          </div>
        ))}

      </div>

      {/* ADD / EDIT MODAL */}
      <Modal
        isOpen={modalOpen}
        onClose={closeModal}
        title={
          editing
            ? 'Edit Verified Knowledge'
            : 'Add Verified Knowledge'
        }
      >

        <form
          onSubmit={handleSave}
          className="space-y-4"
        >

          <Input
            label="Title"
            required
            value={newItem.title}
            onChange={e =>
              setNewItem({
                ...newItem,
                title: e.target.value,
              })
            }
            placeholder="e.g. German A1 Weekend Schedule"
          />

          <div>
            <label className="block text-xs font-semibold text-[#111111] mb-1.5">
              Category
            </label>

            <select
              className="w-full px-3.5 py-2 text-sm bg-white border border-[#E5E7EB] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#63B99B]/40"
              value={newItem.category}
              onChange={e =>
                setNewItem({
                  ...newItem,
                  category: e.target.value,
                })
              }
            >
              <option value="courses">
                Courses
              </option>

              <option value="pricing">
                Pricing
              </option>

              <option value="schedules">
                Schedules
              </option>

              <option value="locations">
                Locations
              </option>

              <option value="registration">
                Registration
              </option>

              <option value="payments">
                Payments
              </option>

              <option value="requirements">
                Requirements
              </option>

              <option value="services">
                Services
              </option>

              <option value="policies">
                Policies
              </option>

              <option value="general">
                General
              </option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-[#111111] mb-1.5">
              Knowledge Content
            </label>

            <textarea
              required
              rows={8}
              className="w-full px-3.5 py-2 text-sm bg-white border border-[#E5E7EB] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#63B99B]/40"
              value={newItem.content}
              onChange={e =>
                setNewItem({
                  ...newItem,
                  content: e.target.value,
                })
              }
              placeholder="Enter exact verified facts TejBot is allowed to use..."
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-[#111111] mb-1.5">
              Priority
            </label>

            <input
              type="number"
              min="0"
              max="10"
              value={newItem.priority}
              onChange={e =>
                setNewItem({
                  ...newItem,
                  priority: e.target.value,
                })
              }
              className="w-full px-3.5 py-2 text-sm bg-white border border-[#E5E7EB] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#63B99B]/40"
            />

            <p className="text-[11px] text-[#98A2B3] mt-1">
              Higher priority gives this knowledge more weight during retrieval.
            </p>
          </div>

          <div className="flex justify-end space-x-2 pt-2">

            <Button
              type="button"
              variant="secondary"
              onClick={closeModal}
              disabled={saving}
            >
              Cancel
            </Button>

            <Button
              type="submit"
              variant="primary"
              disabled={saving}
            >
              {saving
                ? 'Saving...'
                : editing
                  ? 'Save Changes'
                  : 'Save & Publish'}
            </Button>

          </div>

        </form>

      </Modal>

    </div>
  );
}