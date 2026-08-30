'use client';
import React, { useState, useEffect } from 'react';
import Badge from '../../components/ui/Badge';
import Button from '../../components/ui/Button';
import Modal from '../../components/ui/Modal';
import Input from '../../components/ui/Input';
import { Plus, Clock, Calendar, RefreshCw } from 'lucide-react';

export default function CoursesPage() {
  const [courses, setCourses] = useState([]);
  const [modalOpen, setModalOpen] = useState(false);
  const [newCourse, setNewCourse] = useState({ name: '', level: 'A1', price: '', duration: '', schedule: '' });
  const [loading, setLoading] = useState(true);

  const fetchCourses = async () => {
    try {
      const res = await fetch('/api/courses');
      if (res.ok) {
        const data = await res.json();
        setCourses(data);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCourses();
  }, []);

  const handleAdd = async (e) => {
    e.preventDefault();
    try {
      const res = await fetch('/api/courses', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newCourse),
      });
      if (res.ok) {
        fetchCourses();
        setModalOpen(false);
        setNewCourse({ name: '', level: 'A1', price: '', duration: '', schedule: '' });
      }
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-[#111111]">Courses & Tuition Pricing</h1>
          <p className="text-xs text-[#667085] mt-0.5">Official course records and pricing used by the AI Agent.</p>
        </div>
        <div className="flex items-center space-x-2">
          <button onClick={fetchCourses} className="p-2 hover:bg-gray-100 rounded-lg text-[#667085]">
            <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
          </button>
          <Button variant="primary" size="sm" onClick={() => setModalOpen(true)}>
            <Plus size={15} className="mr-1.5" /> Add New Programme
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {courses.map(c => (
          <div key={c.id} className="bg-white border border-[#E5E7EB] rounded-xl p-5 shadow-xs flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between">
                <Badge variant="brand">{c.level} Level</Badge>
                <span className="text-base font-bold text-[#111111]">₦{Number(c.price).toLocaleString()}</span>
              </div>
              <h3 className="font-bold text-sm text-[#111111] mt-3">{c.name}</h3>

              <div className="space-y-1.5 mt-3 text-xs text-[#667085]">
                <p className="flex items-center"><Clock size={13} className="mr-1.5 text-[#63B99B]" /> Duration: <span className="font-semibold text-[#111111] ml-1">{c.duration}</span></p>
                <p className="flex items-center"><Calendar size={13} className="mr-1.5 text-[#63B99B]" /> Schedule: <span className="font-semibold text-[#111111] ml-1">{c.schedule}</span></p>
              </div>
            </div>
            <div className="mt-4 pt-3 border-t border-[#E5E7EB] flex items-center justify-between text-xs">
              <span className="text-emerald-700 font-semibold">● Active in AI Catalog</span>
            </div>
          </div>
        ))}
      </div>

      <Modal isOpen={modalOpen} onClose={() => setModalOpen(false)} title="Create New Course">
        <form onSubmit={handleAdd} className="space-y-4">
          <Input label="Programme Name" required value={newCourse.name} onChange={e => setNewCourse({ ...newCourse, name: e.target.value })} placeholder="e.g. German B2 Advanced" />
          <Input label="Tuition Fee (₦)" required value={newCourse.price} onChange={e => setNewCourse({ ...newCourse, price: e.target.value })} placeholder="250000" />
          <Input label="Duration" required value={newCourse.duration} onChange={e => setNewCourse({ ...newCourse, duration: e.target.value })} placeholder="12 Weeks" />
          <Input label="Class Schedule" required value={newCourse.schedule} onChange={e => setNewCourse({ ...newCourse, schedule: e.target.value })} placeholder="Mon & Wed 6:00 PM" />
          <div className="flex justify-end space-x-2 pt-2">
            <Button type="button" variant="secondary" onClick={() => setModalOpen(false)}>Cancel</Button>
            <Button type="submit" variant="primary">Save Course</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}