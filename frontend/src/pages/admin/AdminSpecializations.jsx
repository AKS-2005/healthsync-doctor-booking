import React, { useState, useEffect } from 'react';
import { specializationApi } from '../../services/api';
import { useToast } from '../../context/ToastContext';
import { Layers, Plus, Trash2, Edit2, HeartPulse, Check } from 'lucide-react';
import { Modal } from '../../components/common/Modal';
import { LoadingSpinner } from '../../components/common/LoadingSpinner';

export const AdminSpecializations = () => {
  const toast = useToast();
  const [specializations, setSpecializations] = useState([]);
  const [loading, setLoading] = useState(true);

  // Modal State
  const [modalOpen, setModalOpen] = useState(false);
  const [editingSpec, setEditingSpec] = useState(null);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [icon, setIcon] = useState('stethoscope');
  const [saving, setSaving] = useState(false);

  const fetchSpecializations = async () => {
    setLoading(true);
    try {
      const res = await specializationApi.getAll();
      if (res.data.success) {
        setSpecializations(res.data.data);
      }
    } catch (err) {
      toast.error('Failed to load specializations');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSpecializations();
  }, []);

  const openCreateModal = () => {
    setEditingSpec(null);
    setName('');
    setDescription('');
    setIcon('stethoscope');
    setModalOpen(true);
  };

  const openEditModal = (spec) => {
    setEditingSpec(spec);
    setName(spec.name);
    setDescription(spec.description || '');
    setIcon(spec.icon || 'stethoscope');
    setModalOpen(true);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      if (editingSpec) {
        const res = await specializationApi.update(editingSpec.id, { name, description, icon });
        if (res.data.success) {
          toast.success('Specialization updated & Redis cache cleared');
        }
      } else {
        const res = await specializationApi.create({ name, description, icon });
        if (res.data.success) {
          toast.success('Specialization created & Redis cache cleared');
        }
      }
      setModalOpen(false);
      fetchSpecializations();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to save specialization');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id, name) => {
    if (!window.confirm(`Are you sure you want to delete "${name}"?`)) return;

    try {
      const res = await specializationApi.delete(id);
      if (res.data.success) {
        toast.success(`Specialization "${name}" deleted`);
        fetchSpecializations();
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Could not delete specialization');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">Medical Specializations</h1>
          <p className="text-xs text-slate-500 mt-1">Manage clinical departments with automatic Redis cache invalidation</p>
        </div>

        <button
          onClick={openCreateModal}
          className="btn-primary text-xs font-bold flex items-center gap-1.5 self-start"
        >
          <Plus className="w-4 h-4" /> Add Specialization
        </button>
      </div>

      <div className="card-premium overflow-hidden">
        {loading ? (
          <LoadingSpinner />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-500 font-semibold border-b border-slate-100 uppercase tracking-wider">
                <tr>
                  <th className="py-3.5 px-4">Department Name</th>
                  <th className="py-3.5 px-4">Description</th>
                  <th className="py-3.5 px-4">Active Doctors</th>
                  <th className="py-3.5 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {specializations.map((spec) => (
                  <tr key={spec.id} className="hover:bg-slate-50/60 transition-colors">
                    <td className="py-3.5 px-4 font-bold text-slate-900 flex items-center gap-2">
                      <div className="w-7 h-7 rounded-lg bg-emerald-50 text-emerald-700 flex items-center justify-center">
                        <HeartPulse className="w-4 h-4" />
                      </div>
                      {spec.name}
                    </td>
                    <td className="py-3.5 px-4 text-slate-600 max-w-md">
                      {spec.description || '—'}
                    </td>
                    <td className="py-3.5 px-4 font-mono font-bold text-emerald-700">
                      {spec.doctor_count || 0} doctors
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => openEditModal(spec)}
                          className="p-1 text-slate-400 hover:text-slate-700"
                          title="Edit"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(spec.id, spec.name)}
                          className="p-1 text-slate-400 hover:text-rose-600"
                          title="Delete"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Create / Edit Modal */}
      <Modal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editingSpec ? 'Edit Specialization' : 'Create Specialization'}
      >
        <form onSubmit={handleSave} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Department Name</label>
            <input
              type="text"
              required
              placeholder="e.g. Ophthalmology, Oncology"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="input-field text-xs"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Description</label>
            <textarea
              rows="3"
              placeholder="Summary of medical services in this field..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="input-field text-xs"
            />
          </div>

          <div className="grid grid-cols-2 gap-3 pt-2">
            <button
              type="button"
              onClick={() => setModalOpen(false)}
              className="btn-secondary text-xs"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="btn-primary text-xs font-bold"
            >
              {saving ? 'Saving...' : editingSpec ? 'Save Changes' : 'Create'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
