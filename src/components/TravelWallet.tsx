import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import api from '../utils/api';
import {
  CreditCard, FileText, Plus, Edit, Trash2, Lock, Shield,
  AlertCircle, Syringe, Car, Globe, User, Briefcase, Camera,
  CheckCircle, Phone, Mail, MapPin, Calendar, Hash, Info,
} from 'lucide-react';

interface TravelDocument {
  _id: string;
  type: 'passport'|'visa'|'creditCard'|'vaccination'|'drivingLicense'|'internationalPermit'|'nationalId'|'insurance';
  number: string;
  expiryDate: string;
  issueDate?: string;
  country?: string;
  nationality?: string;
  issuer?: string;
  notes?: string;
  photoUrl?: string;
  // Visa
  visaType?: string;
  entries?: string;
  // Card
  bankName?: string;
  cardType?: string;
  // Vaccination
  vaccineType?: string;
  manufacturer?: string;
  lotNumber?: string;
  doseDates?: string[];
  // Insurance
  insuranceProvider?: string;
  policyNumber?: string;
  coverageAmount?: string;
  emergencyPhone?: string;
  coverageDetails?: string;
  // Driving
  licenseClass?: string;
  // Embassy
  embassy?: { name: string; address: string; phone: string; email: string };
}

type DocType = TravelDocument['type'];

const DOC_CONFIG: Record<DocType, { label: string; gradient: string; icon: React.ReactNode; bg: string }> = {
  passport:          { label:'Passport',                   gradient:'from-blue-600 to-indigo-700',   icon:<FileText className="h-6 w-6"/>,  bg:'bg-blue-50' },
  visa:              { label:'Visa',                       gradient:'from-green-500 to-teal-600',    icon:<Globe className="h-6 w-6"/>,     bg:'bg-green-50' },
  creditCard:        { label:'Credit Card',               gradient:'from-purple-600 to-pink-600',   icon:<CreditCard className="h-6 w-6"/>,bg:'bg-purple-50' },
  vaccination:       { label:'Vaccination Certificate',   gradient:'from-red-500 to-orange-500',    icon:<Syringe className="h-6 w-6"/>,   bg:'bg-red-50' },
  drivingLicense:    { label:'Driving License',           gradient:'from-indigo-500 to-blue-600',   icon:<Car className="h-6 w-6"/>,       bg:'bg-indigo-50' },
  internationalPermit:{ label:'International Permit',    gradient:'from-teal-500 to-cyan-600',     icon:<Globe className="h-6 w-6"/>,     bg:'bg-teal-50' },
  nationalId:        { label:'National ID',               gradient:'from-orange-500 to-yellow-500', icon:<User className="h-6 w-6"/>,      bg:'bg-orange-50' },
  insurance:         { label:'Insurance',                 gradient:'from-gray-600 to-slate-700',    icon:<Briefcase className="h-6 w-6"/>, bg:'bg-gray-50' },
};

const emptyForm = (): Partial<TravelDocument> => ({
  type:'passport', number:'', expiryDate:'', issueDate:'', country:'', nationality:'',
  issuer:'', notes:'', photoUrl:'', visaType:'', entries:'', bankName:'', cardType:'',
  vaccineType:'', manufacturer:'', lotNumber:'', doseDates:[], insuranceProvider:'',
  policyNumber:'', coverageAmount:'', emergencyPhone:'', coverageDetails:'', licenseClass:'',
});

const Field = ({ label, value, icon }: { label: string; value?: string; icon?: React.ReactNode }) =>
  value ? (
    <div className="flex flex-col gap-0.5">
      <span className="text-xs font-semibold text-gray-400 uppercase tracking-wide flex items-center gap-1">
        {icon}{label}
      </span>
      <span className="text-gray-800 font-medium">{value}</span>
    </div>
  ) : null;

const Input = ({ label, name, type='text', value, onChange, placeholder }: {
  label:string; name:string; type?:string; value:string; onChange:(e:React.ChangeEvent<HTMLInputElement>)=>void; placeholder?:string;
}) => (
  <div>
    <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>
    <input type={type} name={name} value={value} onChange={onChange} placeholder={placeholder}
      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-400 focus:border-transparent outline-none transition" />
  </div>
);

export default function TravelWallet() {
  const [documents, setDocuments] = useState<TravelDocument[]>([]);
  const [selected, setSelected] = useState<TravelDocument|null>(null);
  const [mode, setMode] = useState<'view'|'add'|'edit'|'delete'>('view');
  const [form, setForm] = useState<Partial<TravelDocument>>(emptyForm());
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string|null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => { fetchDocs(); }, []);

  // localStorage helpers for photos (too large for DynamoDB 400KB limit)
  const PHOTO_KEY = 'wallet_photos';
  const getPhotos = (): Record<string, string> => {
    try { return JSON.parse(localStorage.getItem(PHOTO_KEY) || '{}'); } catch { return {}; }
  };
  const savePhoto = (id: string, url: string) => {
    const p = getPhotos(); p[id] = url; localStorage.setItem(PHOTO_KEY, JSON.stringify(p));
  };
  const deletePhoto = (id: string) => {
    const p = getPhotos(); delete p[id]; localStorage.setItem(PHOTO_KEY, JSON.stringify(p));
  };
  const mergePhotos = (docs: TravelDocument[]): TravelDocument[] => {
    const photos = getPhotos();
    return docs.map(d => ({ ...d, photoUrl: photos[d._id] || d.photoUrl }));
  };

  const fetchDocs = async () => {
    setLoading(true);
    try {
      const r = await api.get('/api/travel-wallet/documents');
      setDocuments(mergePhotos(r.data));
    }
    catch { setError('Failed to load documents'); }
    finally { setLoading(false); }
  };

  const getExpiry = (d: string) => {
    const exp = new Date(d), now = new Date();
    const months = (exp.getFullYear()-now.getFullYear())*12+(exp.getMonth()-now.getMonth());
    if (exp < now) return { label:'Expired', cls:'bg-red-100 text-red-700' };
    if (months <= 3) return { label:'Expiring Soon', cls:'bg-yellow-100 text-yellow-700' };
    return { label:'Valid', cls:'bg-green-100 text-green-700' };
  };

  const handlePhoto = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]; if (!file) return;
    const reader = new FileReader();
    reader.onload = () => setForm(f => ({ ...f, photoUrl: reader.result as string }));
    reader.readAsDataURL(file);
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement|HTMLSelectElement|HTMLTextAreaElement>) =>
    setForm(f => ({ ...f, [e.target.name]: e.target.value }));

  const openAdd = () => { setForm(emptyForm()); setSelected(null); setMode('add'); };
  const openEdit = () => { if (!selected) return; setForm({ ...selected, expiryDate: selected.expiryDate.split('T')[0], issueDate: selected.issueDate?.split('T')[0]||'' }); setMode('edit'); };

  const save = async () => {
    if (!form.number || !form.expiryDate) { alert('Document number and expiry date are required'); return; }
    // Strip photoUrl before sending to backend (stored in localStorage instead)
    const { photoUrl, ...payload } = form;
    try {
      if (mode === 'add') {
        const r = await api.post('/api/travel-wallet/documents', payload);
        const docWithPhoto = { ...r.data, photoUrl: photoUrl || '' };
        if (photoUrl) savePhoto(r.data._id, photoUrl);
        setDocuments(d => [...d, docWithPhoto]);
        setSelected(docWithPhoto);
      } else {
        const r = await api.put(`/api/travel-wallet/documents/${selected!._id}`, payload);
        const docWithPhoto = { ...r.data, photoUrl: photoUrl || selected?.photoUrl || '' };
        if (photoUrl) savePhoto(r.data._id, photoUrl);
        setDocuments(d => d.map(x => x._id === selected!._id ? docWithPhoto : x));
        setSelected(docWithPhoto);
      }
      setMode('view');
    } catch (err: any) {
      alert('Failed to save document: ' + (err?.response?.data?.message || err?.message || 'Unknown error'));
    }
  };

  const del = async () => {
    if (!selected) return;
    try {
      await api.delete(`/api/travel-wallet/documents/${selected._id}`);
      deletePhoto(selected._id);  // clean up localStorage photo
      setDocuments(d => d.filter(x => x._id !== selected._id));
      setSelected(null); setMode('view');
    } catch { alert('Failed to delete'); }
  };

  const cfg = (t: DocType) => DOC_CONFIG[t];

  // ── Document Card (physical card style) ──────────────────────────────────
  const DocCard = ({ doc }: { doc: TravelDocument }) => {
    const c = cfg(doc.type);
    const exp = getExpiry(doc.expiryDate);
    return (
      <motion.div whileHover={{ scale: 1.02, y: -2 }} whileTap={{ scale: 0.98 }}
        onClick={() => { setSelected(doc); setMode('view'); }}
        className={`relative cursor-pointer rounded-2xl overflow-hidden shadow-md border-2 transition-all ${
          selected?._id===doc._id ? 'border-indigo-400 shadow-indigo-200' : 'border-transparent'}`}>
        <div className={`bg-gradient-to-br ${c.gradient} p-5 text-white`}>
          <div className="flex justify-between items-start mb-8">
            <div className="bg-white/20 backdrop-blur-sm rounded-xl p-2">{c.icon}</div>
            <span className={`text-xs px-2 py-1 rounded-full font-semibold ${exp.cls}`}>{exp.label}</span>
          </div>
          {doc.photoUrl && (
            <img src={doc.photoUrl} alt="doc" className="absolute top-3 right-12 w-10 h-10 rounded-full object-cover border-2 border-white/50" />
          )}
          <p className="text-white/70 text-xs mb-1">{c.label}</p>
          <p className="font-mono text-sm tracking-widest truncate">{doc.number}</p>
          <div className="flex justify-between mt-3 text-xs text-white/80">
            <span>{doc.country || doc.nationality || ''}</span>
            <span>Exp: {new Date(doc.expiryDate).toLocaleDateString('en-US',{month:'short',year:'numeric'})}</span>
          </div>
        </div>
      </motion.div>
    );
  };

  // ── Detail Panel ──────────────────────────────────────────────────────────
  const DetailPanel = () => {
    if (!selected) return null;
    const c = cfg(selected.type);
    const exp = getExpiry(selected.expiryDate);
    return (
      <motion.div initial={{ opacity:0, x:20 }} animate={{ opacity:1, x:0 }} className="bg-white rounded-2xl shadow-xl overflow-hidden">
        {/* Header */}
        <div className={`bg-gradient-to-r ${c.gradient} p-6 text-white`}>
          <div className="flex justify-between items-start">
            <div>
              <p className="text-white/70 text-sm">{c.label}</p>
              <h2 className="text-2xl font-bold mt-1">{selected.country || selected.nationality || selected.bankName || 'Document'}</h2>
            </div>
            <div className="flex gap-2">
              <button onClick={openEdit} className="p-2 bg-white/20 hover:bg-white/30 rounded-xl transition"><Edit className="h-4 w-4"/></button>
              <button onClick={() => setMode('delete')} className="p-2 bg-white/20 hover:bg-white/30 rounded-xl transition"><Trash2 className="h-4 w-4"/></button>
            </div>
          </div>
          {/* Photo */}
          {selected.photoUrl ? (
            <img src={selected.photoUrl} alt="Document" className="mt-4 w-full h-40 object-cover rounded-xl border-2 border-white/30" />
          ) : (
            <div className="mt-4 h-32 bg-white/10 rounded-xl flex items-center justify-center border-2 border-dashed border-white/30">
              <div className="text-center text-white/60"><Camera className="h-8 w-8 mx-auto mb-1"/><p className="text-xs">No photo added</p></div>
            </div>
          )}
        </div>

        <div className="p-6 space-y-4">
          {/* Status */}
          <div className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-semibold ${exp.cls}`}>
            {exp.label==='Valid' ? <CheckCircle className="h-4 w-4"/> : <AlertCircle className="h-4 w-4"/>}
            {exp.label} · Expires {new Date(selected.expiryDate).toLocaleDateString()}
          </div>

          {/* Core fields */}
          <div className="grid grid-cols-2 gap-4">
            <Field label="Document No." value={selected.number} icon={<Lock className="h-3 w-3"/>}/>
            <Field label="Expires" value={new Date(selected.expiryDate).toLocaleDateString()} icon={<Calendar className="h-3 w-3"/>}/>
            {selected.issueDate && <Field label="Issue Date" value={new Date(selected.issueDate).toLocaleDateString()} icon={<Calendar className="h-3 w-3"/>}/>}
            <Field label="Country" value={selected.country} icon={<Globe className="h-3 w-3"/>}/>
            <Field label="Nationality" value={selected.nationality} icon={<User className="h-3 w-3"/>}/>
            <Field label="Issued By" value={selected.issuer} icon={<Info className="h-3 w-3"/>}/>
            {/* Visa */}
            <Field label="Visa Type" value={selected.visaType} icon={<FileText className="h-3 w-3"/>}/>
            <Field label="Entries" value={selected.entries} icon={<Hash className="h-3 w-3"/>}/>
            {/* Card */}
            <Field label="Bank" value={selected.bankName} icon={<CreditCard className="h-3 w-3"/>}/>
            <Field label="Card Type" value={selected.cardType} icon={<CreditCard className="h-3 w-3"/>}/>
            {/* Vaccination */}
            <Field label="Vaccine" value={selected.vaccineType} icon={<Syringe className="h-3 w-3"/>}/>
            <Field label="Manufacturer" value={selected.manufacturer}/>
            <Field label="Lot No." value={selected.lotNumber} icon={<Hash className="h-3 w-3"/>}/>
            {/* Driving */}
            <Field label="License Class" value={selected.licenseClass} icon={<Car className="h-3 w-3"/>}/>
            {/* Insurance */}
            <Field label="Provider" value={selected.insuranceProvider} icon={<Shield className="h-3 w-3"/>}/>
            <Field label="Policy No." value={selected.policyNumber} icon={<Hash className="h-3 w-3"/>}/>
            <Field label="Coverage" value={selected.coverageAmount}/>
            <Field label="Emergency" value={selected.emergencyPhone} icon={<Phone className="h-3 w-3"/>}/>
          </div>

          {selected.doseDates && selected.doseDates.length > 0 && (
            <div>
              <p className="text-xs font-semibold text-gray-400 uppercase mb-2">Dose Dates</p>
              <div className="space-y-1">
                {selected.doseDates.map((d,i) => <p key={i} className="text-sm text-gray-700">Dose {i+1}: {new Date(d).toLocaleDateString()}</p>)}
              </div>
            </div>
          )}

          {selected.coverageDetails && (
            <div><p className="text-xs font-semibold text-gray-400 uppercase mb-1">Coverage Details</p>
            <p className="text-sm text-gray-700 bg-gray-50 rounded-lg p-3">{selected.coverageDetails}</p></div>
          )}

          {selected.embassy && (
            <div className="bg-blue-50 rounded-xl p-4">
              <p className="text-xs font-semibold text-blue-400 uppercase mb-2">Embassy</p>
              <p className="font-semibold text-gray-800">{selected.embassy.name}</p>
              <div className="mt-2 space-y-1 text-sm text-gray-600">
                <p className="flex items-center gap-2"><MapPin className="h-3 w-3"/>{selected.embassy.address}</p>
                <p className="flex items-center gap-2"><Phone className="h-3 w-3"/>{selected.embassy.phone}</p>
                <p className="flex items-center gap-2"><Mail className="h-3 w-3"/>{selected.embassy.email}</p>
              </div>
            </div>
          )}

          {selected.notes && (
            <div><p className="text-xs font-semibold text-gray-400 uppercase mb-1">Notes</p>
            <p className="text-sm text-gray-700 bg-yellow-50 rounded-lg p-3 border border-yellow-100">{selected.notes}</p></div>
          )}
        </div>
      </motion.div>
    );
  };

  // ── Form ─────────────────────────────────────────────────────────────────
  const FormPanel = () => (
    <motion.div initial={{ opacity:0, x:20 }} animate={{ opacity:1, x:0 }} className="bg-white rounded-2xl shadow-xl overflow-hidden">
      <div className={`bg-gradient-to-r ${cfg(form.type as DocType || 'passport').gradient} p-6 text-white`}>
        <h2 className="text-xl font-bold">{mode==='edit' ? 'Edit Document' : 'Add New Document'}</h2>
        <p className="text-white/70 text-sm mt-1">Fill in the details for your document</p>
      </div>
      <div className="p-6 space-y-4 max-h-[65vh] overflow-y-auto">
        {/* Photo upload */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Document Photo</label>
          <div onClick={() => fileRef.current?.click()}
            className="cursor-pointer border-2 border-dashed border-gray-300 rounded-xl p-4 flex flex-col items-center hover:border-indigo-400 hover:bg-indigo-50 transition">
            {form.photoUrl ? (
              <img src={form.photoUrl} alt="preview" className="w-full h-32 object-cover rounded-lg"/>
            ) : (
              <><Camera className="h-8 w-8 text-gray-400 mb-2"/><p className="text-sm text-gray-500">Click to upload photo</p></>
            )}
          </div>
          <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handlePhoto}/>
        </div>

        {/* Type */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Document Type</label>
          <select name="type" value={form.type||'passport'} onChange={handleChange}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-400 outline-none">
            {Object.entries(DOC_CONFIG).map(([k,v]) => <option key={k} value={k}>{v.label}</option>)}
          </select>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <Input label="Document Number *" name="number" value={form.number||''} onChange={handleChange} placeholder="e.g. A1234567"/>
          <Input label="Expiry Date *" name="expiryDate" type="date" value={form.expiryDate||''} onChange={handleChange}/>
          <Input label="Issue Date" name="issueDate" type="date" value={form.issueDate||''} onChange={handleChange}/>
          <Input label="Country" name="country" value={form.country||''} onChange={handleChange} placeholder="India"/>
          <Input label="Nationality" name="nationality" value={form.nationality||''} onChange={handleChange} placeholder="Indian"/>
          <Input label="Issued By" name="issuer" value={form.issuer||''} onChange={handleChange} placeholder="Issuing authority"/>
        </div>

        {(form.type==='visa') && (
          <div className="grid grid-cols-2 gap-3">
            <Input label="Visa Type" name="visaType" value={form.visaType||''} onChange={handleChange} placeholder="Tourist / Business"/>
            <Input label="Entries" name="entries" value={form.entries||''} onChange={handleChange} placeholder="Single / Multiple"/>
          </div>
        )}
        {form.type==='creditCard' && (
          <div className="grid grid-cols-2 gap-3">
            <Input label="Bank Name" name="bankName" value={form.bankName||''} onChange={handleChange} placeholder="HDFC / SBI"/>
            <Input label="Card Type" name="cardType" value={form.cardType||''} onChange={handleChange} placeholder="Visa / Mastercard"/>
          </div>
        )}
        {form.type==='vaccination' && (
          <div className="grid grid-cols-2 gap-3">
            <Input label="Vaccine Name" name="vaccineType" value={form.vaccineType||''} onChange={handleChange} placeholder="Covishield"/>
            <Input label="Manufacturer" name="manufacturer" value={form.manufacturer||''} onChange={handleChange} placeholder="AstraZeneca"/>
            <Input label="Lot Number" name="lotNumber" value={form.lotNumber||''} onChange={handleChange} placeholder="4120Z001"/>
          </div>
        )}
        {form.type==='drivingLicense' && (
          <Input label="License Class" name="licenseClass" value={form.licenseClass||''} onChange={handleChange} placeholder="LMV / HMV"/>
        )}
        {form.type==='insurance' && (
          <div className="grid grid-cols-2 gap-3">
            <Input label="Provider" name="insuranceProvider" value={form.insuranceProvider||''} onChange={handleChange} placeholder="LIC / Star Health"/>
            <Input label="Policy Number" name="policyNumber" value={form.policyNumber||''} onChange={handleChange}/>
            <Input label="Coverage Amount" name="coverageAmount" value={form.coverageAmount||''} onChange={handleChange} placeholder="₹5,00,000"/>
            <Input label="Emergency Phone" name="emergencyPhone" value={form.emergencyPhone||''} onChange={handleChange} placeholder="+91 1800..."/>
          </div>
        )}

        {/* Notes */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
          <textarea name="notes" value={form.notes||''} onChange={handleChange} rows={2}
            placeholder="Any additional notes..."
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-400 outline-none resize-none"/>
        </div>

        <div className="flex gap-3 pt-2">
          <button onClick={() => { setMode('view'); setForm(emptyForm()); }}
            className="flex-1 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 text-sm transition">Cancel</button>
          <button onClick={save}
            className={`flex-1 py-2 rounded-lg text-white text-sm font-semibold transition bg-gradient-to-r ${cfg(form.type as DocType||'passport').gradient} hover:opacity-90`}>
            {mode==='edit' ? 'Update' : 'Add Document'}
          </button>
        </div>
      </div>
    </motion.div>
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-indigo-950 to-purple-950 py-10 px-4">
      {/* Header */}
      <div className="max-w-6xl mx-auto mb-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-extrabold text-white">✈️ Travel Wallet</h1>
            <p className="text-indigo-300 mt-1">Securely store all your travel documents</p>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 bg-white/10 backdrop-blur px-3 py-2 rounded-xl text-white/80 text-sm">
              <Shield className="h-4 w-4 text-green-400"/><span>{documents.length} docs secured</span>
            </div>
            <motion.button whileHover={{ scale:1.05 }} whileTap={{ scale:0.95 }} onClick={openAdd}
              className="flex items-center gap-2 bg-indigo-500 hover:bg-indigo-600 text-white px-4 py-2 rounded-xl font-semibold text-sm transition">
              <Plus className="h-4 w-4"/> Add Document
            </motion.button>
          </div>
        </div>
      </div>

      {loading && <p className="text-center text-indigo-300 mb-4">Loading documents...</p>}
      {error && <p className="text-center text-red-400 mb-4">{error}</p>}

      <div className="max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-5 gap-6">
        {/* Left: cards list */}
        <div className="lg:col-span-2 space-y-3">
          {documents.length === 0 && !loading ? (
            <div className="text-center py-16 text-indigo-300">
              <Lock className="h-12 w-12 mx-auto mb-3 opacity-40"/>
              <p className="font-medium">No documents yet</p>
              <p className="text-sm opacity-60 mt-1">Add your first travel document</p>
            </div>
          ) : (
            documents.map(doc => <DocCard key={doc._id} doc={doc}/>)
          )}
        </div>

        {/* Right: detail / form */}
        <div className="lg:col-span-3">
          <AnimatePresence mode="wait">
            {(mode==='add'||mode==='edit') ? (
              <FormPanel key="form"/>
            ) : mode==='delete' && selected ? (
              <motion.div key="del" initial={{ opacity:0 }} animate={{ opacity:1 }} exit={{ opacity:0 }}
                className="bg-white rounded-2xl shadow-xl p-8 text-center">
                <div className="bg-red-100 p-4 rounded-full inline-flex mb-4"><Trash2 className="h-8 w-8 text-red-600"/></div>
                <h3 className="text-xl font-bold text-gray-900 mb-2">Delete Document?</h3>
                <p className="text-gray-500 mb-6">This will permanently remove your <strong>{cfg(selected.type).label}</strong>. This cannot be undone.</p>
                <div className="flex gap-3 justify-center">
                  <button onClick={() => setMode('view')} className="px-6 py-2 border border-gray-300 rounded-xl text-gray-700 hover:bg-gray-50">Cancel</button>
                  <button onClick={del} className="px-6 py-2 bg-red-600 text-white rounded-xl hover:bg-red-700">Delete</button>
                </div>
              </motion.div>
            ) : selected ? (
              <DetailPanel key={selected._id}/>
            ) : (
              <motion.div key="empty" initial={{ opacity:0 }} animate={{ opacity:1 }}
                className="h-full flex flex-col items-center justify-center text-center py-20 bg-white/5 backdrop-blur rounded-2xl border border-white/10">
                <CreditCard className="h-16 w-16 text-indigo-400 mb-4 opacity-60"/>
                <p className="text-white font-semibold text-lg">Select a document</p>
                <p className="text-indigo-300 text-sm mt-1">Click any card to view full details</p>
                <motion.button whileHover={{ scale:1.05 }} onClick={openAdd}
                  className="mt-6 flex items-center gap-2 bg-indigo-500 hover:bg-indigo-600 text-white px-5 py-2 rounded-xl text-sm font-semibold transition">
                  <Plus className="h-4 w-4"/> Add First Document
                </motion.button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}