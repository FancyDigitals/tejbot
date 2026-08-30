'use client';
import React, { useState } from 'react';
import Badge from '../../components/ui/Badge';
import Button from '../../components/ui/Button';
import Modal from '../../components/ui/Modal';
import Input from '../../components/ui/Input';
import { BookOpen, Plus, CheckCircle, Search, ShieldCheck } from 'lucide-react';

const mockKnowledge = [
  { id: '1', title: 'Office Location & Learning Centers', category: 'locations', content: 'TEJUROLEX GLOBAL offices: 12 Airport Road, Ikeja, Lagos. Also offers live online classes worldwide.', published: true, priority: 10 },
  { id: '2', title: 'Official Registration Procedure', category: 'registration', content: 'Select programme, submit full legal name/email, pay tuition into official account, and send proof via WhatsApp.', published: true, priority: 10 },
  { id: '3', title: 'Bank Account & Payment Policies', category: 'payments', content: 'Official bank transfer to TEJUROLEX GLOBAL LTD. 2-part installment plans allowed (60% deposit / 40% mid-course).', published: true, priority: 10 },
  { id: '4', title: 'German Study, Ausbildung & Opportunity Card Advisory', category: 'services', content: 'Complete document verification, university admission processing, and Ausbildung pathway support.', published: true, priority: 8 },
];

export default function KnowledgePage() {
  const [items, setItems] = useState(mockKnowledge);
  const [modalOpen, setModalOpen] = useState(false);
  const [newItem, setNewItem] = useState({ title: '', category: 'courses', content: '', priority: 5 });

  const handleAdd = (e) => {
    e.preventDefault();
    setItems(prev => [...prev, { ...newItem, id: `k_${Date.now()}`, published: true }]);
    setModalOpen(false);
    setNewItem({ title: '', category: 'courses', content: '', priority: 5 });
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2">
            <h1 className="text-xl font-bold text-[#111111]">Knowledge Base (Zero-Hallucination RAG)</h1>
            <Badge variant="brand"><ShieldCheck size={12} className="mr-1 inline" /> Verified AI Source</Badge>
          </div>
          <p className="text-xs text-[#667085] mt-0.5">The WhatsApp AI Sales Agent ONLY uses published items in this knowledge base.</p>
        </div>
        <Button variant="primary" size="sm" onClick={() => setModalOpen(true)}>
          <Plus size={15} className="mr-1.5" /> Add Knowledge Item
        </Button>
      </div>

      {/* Grid of Knowledge Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {items.map(item => (
          <div key={item.id} className="bg-white border border-[#E5E7EB] rounded-xl p-5 shadow-xs flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded bg-gray-100 text-gray-700">
                  {item.category}
                </span>
                <span className="text-xs text-[#63B99B] font-semibold flex items-center">
                  <CheckCircle size={13} className="mr-1" /> Published
                </span>
              </div>
              <h3 className="font-bold text-sm text-[#111111]">{item.title}</h3>
              <p className="text-xs text-[#667085] mt-2 leading-relaxed whitespace-pre-wrap">{item.content}</p>
            </div>
            <div className="mt-4 pt-3 border-t border-[#E5E7EB] flex items-center justify-between text-[11px] text-[#667085]">
              <span>Priority: {item.priority}/10</span>
              <button className="text-red-600 hover:underline">Remove</button>
            </div>
          </div>
        ))}
      </div>

      {/* Add Knowledge Modal */}
      <Modal isOpen={modalOpen} onClose={() => setModalOpen(false)} title="Add Verified Knowledge">
        <form onSubmit={handleAdd} className="space-y-4">
          <Input
            label="Title"
            required
            value={newItem.title}
            onChange={(e) => setNewItem({ ...newItem, title: e.target.value })}
            placeholder="e.g. German A1 Weekend Schedule"
          />
          <div>
            <label className="block text-xs font-semibold text-[#111111] mb-1.5">Category</label>
            <select
              className="w-full px-3.5 py-2 text-sm bg-white border border-[#E5E7EB] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#63B99B]/40"
              value={newItem.category}
              onChange={(e) => setNewItem({ ...newItem, category: e.target.value })}
            >
              <option value="courses">Courses</option>
              <option value="pricing">Pricing</option>
              <option value="schedules">Schedules</option>
              <option value="locations">Locations</option>
              <option value="registration">Registration</option>
              <option value="payments">Payments</option>
              <option value="services">Services</option>
            </select>
          </div>
          <div>
            <label className="block text-xs font-semibold text-[#111111] mb-1.5">Exact Knowledge Content (Truth)</label>
            <textarea
              required
              rows={4}
              className="w-full px-3.5 py-2 text-sm bg-white border border-[#E5E7EB] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#63B99B]/40"
              value={newItem.content}
              onChange={(e) => setNewItem({ ...newItem, content: e.target.value })}
              placeholder="Paste exact verified facts for the AI to quote..."
            />
          </div>
          <div className="flex justify-end space-x-2 pt-2">
            <Button type="button" variant="secondary" onClick={() => setModalOpen(false)}>Cancel</Button>
            <Button type="submit" variant="primary">Save & Publish</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}