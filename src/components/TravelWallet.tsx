import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import api from '../utils/api';
import {
  CreditCard, FileText, Plus, Edit, Trash2, Lock, Shield,
  AlertCircle, Syringe, Car, Globe, User, Briefcase, Camera,
  CheckCircle, Phone, Mail, MapPin, Calendar, Hash, Info,
  Sparkles, RefreshCw, ShieldAlert, Check
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

interface Trip {
  _id: string;
  destination: string;
  duration: string;
  budget?: string;
  companions?: string;
  activities?: string[];
  date?: string;
}

interface ReadinessAlert {
  type: 'danger' | 'warning' | 'info';
  message: string;
}

interface ReadinessRequirement {
  name: string;
  status: 'verified' | 'warning' | 'missing';
  details: string;
}

interface ReadinessData {
  readinessScore: number;
  confidenceScore: 'High' | 'Medium' | 'Low';
  confidenceReason: string;
  alerts: ReadinessAlert[];
  requirements: ReadinessRequirement[];
  destinationRules: string[];
  transitAdvice: string[];
}

type DocType = TravelDocument['type'];

const DOC_CONFIG: Record<DocType, { label: string; gradient: string; icon: React.ReactNode; bg: string }> = {
  passport:          { label:'Passport',                   gradient:'from-blue-600 to-indigo-700',   icon:<FileText className="h-6 w-6"/>,  bg:'bg-blue-500/10' },
  visa:              { label:'Visa',                       gradient:'from-green-500 to-teal-600',    icon:<Globe className="h-6 w-6"/>,     bg:'bg-green-500/10' },
  creditCard:        { label:'Credit Card',               gradient:'from-purple-600 to-pink-600',   icon:<CreditCard className="h-6 w-6"/>,bg:'bg-purple-500/10' },
  vaccination:       { label:'Vaccination Certificate',   gradient:'from-red-500 to-orange-500',    icon:<Syringe className="h-6 w-6"/>,   bg:'bg-red-500/10' },
  drivingLicense:    { label:'Driving License',           gradient:'from-indigo-500 to-blue-600',   icon:<Car className="h-6 w-6"/>,       bg:'bg-indigo-500/10' },
  internationalPermit:{ label:'International Permit',    gradient:'from-teal-500 to-cyan-600',     icon:<Globe className="h-6 w-6"/>,     bg:'bg-teal-500/10' },
  nationalId:        { label:'National ID',               gradient:'from-orange-500 to-yellow-500', icon:<User className="h-6 w-6"/>,      bg:'bg-orange-500/10' },
  insurance:         { label:'Insurance',                 gradient:'from-gray-600 to-slate-700',    icon:<Briefcase className="h-6 w-6"/>, bg:'bg-gray-500/10' },
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
      <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider flex items-center gap-1">
        {icon}{label}
      </span>
      <span className="text-gray-100 font-medium">{value}</span>
    </div>
  ) : null;

const Input = ({ label, name, type='text', value, onChange, placeholder }: {
  label:string; name:string; type?:string; value:string; onChange:(e:React.ChangeEvent<HTMLInputElement>)=>void; placeholder?:string;
}) => (
  <div>
    <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1">{label}</label>
    <input type={type} name={name} value={value} onChange={onChange} placeholder={placeholder}
      className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-xl text-sm text-white placeholder-gray-500 focus:border-indigo-500 outline-none transition" />
  </div>
);

export default function TravelWallet() {
  const [activeTab, setActiveTab] = useState<'wallet' | 'readiness'>('wallet');
  const [documents, setDocuments] = useState<TravelDocument[]>([]);
  const [selected, setSelected] = useState<TravelDocument|null>(null);
  const [mode, setMode] = useState<'view'|'add'|'edit'|'delete'>('view');
  const [form, setForm] = useState<Partial<TravelDocument>>(emptyForm());
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string|null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  // AI OCR States
  const [isAnalyzingDoc, setIsAnalyzingDoc] = useState(false);

  // AI Eligibility States
  const [trips, setTrips] = useState<Trip[]>([]);
  const [selectedTripId, setSelectedTripId] = useState<string>('');
  const [isCheckingReadiness, setIsCheckingReadiness] = useState(false);
  const [readinessData, setReadinessData] = useState<ReadinessData | null>(null);
  const [readinessError, setReadinessError] = useState<string | null>(null);

  useEffect(() => {
    fetchDocs();
    fetchTrips();
  }, []);

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

  const fetchTrips = async () => {
    try {
      const profileRes = await api.get('/api/profile');
      const userId = profileRes.data._id;
      const tripsResponse = await api.get(`/api/users/${userId}/trips`);
      setTrips(tripsResponse.data);
      if (tripsResponse.data.length > 0) {
        setSelectedTripId(tripsResponse.data[0]._id);
      }
    } catch (err) {
      console.error('Error fetching trips:', err);
    }
  };

  const getExpiry = (d: string) => {
    const exp = new Date(d), now = new Date();
    const months = (exp.getFullYear()-now.getFullYear())*12+(exp.getMonth()-now.getMonth());
    if (exp < now) return { label:'Expired', cls:'bg-rose-500/10 text-rose-400 border-rose-500/20' };
    if (months <= 3) return { label:'Expiring Soon', cls:'bg-amber-500/10 text-amber-400 border-amber-500/20' };
    return { label:'Valid', cls:'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' };
  };

  const handlePhoto = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]; if (!file) return;
    const reader = new FileReader();
    reader.onload = () => setForm(f => ({ ...f, photoUrl: reader.result as string }));
    reader.readAsDataURL(file);
  };

  const handleOcrScan = async () => {
    if (!form.photoUrl) return;
    setIsAnalyzingDoc(true);
    try {
      const response = await api.post('/api/travel-wallet/documents/analyze', {
        image: form.photoUrl,
      });
      const data = response.data;
      
      // Update form with extracted fields
      setForm((f) => ({
        ...f,
        type: data.type || f.type || 'passport',
        number: data.number || f.number || '',
        expiryDate: data.expiryDate ? data.expiryDate.split('T')[0] : f.expiryDate || '',
        issueDate: data.issueDate ? data.issueDate.split('T')[0] : f.issueDate || '',
        country: data.country || f.country || '',
        nationality: data.nationality || f.nationality || '',
        issuer: data.issuer || f.issuer || '',
        notes: data.notes || f.notes || '',
        visaType: data.visaType || f.visaType || '',
        entries: data.entries || f.entries || '',
        bankName: data.bankName || f.bankName || '',
        cardType: data.cardType || f.cardType || '',
        vaccineType: data.vaccineType || f.vaccineType || '',
        manufacturer: data.manufacturer || f.manufacturer || '',
        lotNumber: data.lotNumber || f.lotNumber || '',
        doseDates: data.doseDates || f.doseDates || [],
        licenseClass: data.licenseClass || f.licenseClass || '',
        insuranceProvider: data.insuranceProvider || f.insuranceProvider || '',
        policyNumber: data.policyNumber || f.policyNumber || '',
        coverageAmount: data.coverageAmount || f.coverageAmount || '',
        emergencyPhone: data.emergencyPhone || f.emergencyPhone || '',
        coverageDetails: data.coverageDetails || f.coverageDetails || '',
      }));
      alert('AI OCR Scan completed successfully! Form fields have been populated.');
    } catch (err: any) {
      console.error('Error scanning document:', err);
      alert('Failed to analyze document: ' + (err.response?.data?.message || err.message));
    } finally {
      setIsAnalyzingDoc(false);
    }
  };

  const handleCheckEligibility = async () => {
    if (!selectedTripId) return;
    setIsCheckingReadiness(true);
    setReadinessError(null);
    setReadinessData(null);
    try {
      const response = await api.post('/api/travel-wallet/readiness/check', {
        tripId: selectedTripId
      });
      setReadinessData(response.data);
    } catch (err: any) {
      console.error('Error checking readiness:', err);
      setReadinessError(err.response?.data?.message || err.message || 'Verification failed');
    } finally {
      setIsCheckingReadiness(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement|HTMLSelectElement|HTMLTextAreaElement>) =>
    setForm(f => ({ ...f, [e.target.name]: e.target.value }));

  const openAdd = () => { setForm(emptyForm()); setSelected(null); setMode('add'); };
  const openEdit = () => { if (!selected) return; setForm({ ...selected, expiryDate: selected.expiryDate.split('T')[0], issueDate: selected.issueDate?.split('T')[0]||'' }); setMode('edit'); };

  const save = async () => {
    if (!form.number || !form.expiryDate) { alert('Document number and expiry date are required'); return; }
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
      deletePhoto(selected._id);
      setDocuments(d => d.filter(x => x._id !== selected._id));
      setSelected(null); setMode('view');
    } catch { alert('Failed to delete'); }
  };

  const cfg = (t: DocType) => DOC_CONFIG[t];

  // SVG Gauge calculations
  const radius = 50;
  const circumference = 2 * Math.PI * radius;

  // ── Document Card (physical card style) ──────────────────────────────────
  const DocCard = ({ doc }: { doc: TravelDocument }) => {
    const c = cfg(doc.type);
    const exp = getExpiry(doc.expiryDate);
    return (
      <motion.div whileHover={{ scale: 1.02, y: -2 }} whileTap={{ scale: 0.98 }}
        onClick={() => { setSelected(doc); setMode('view'); }}
        className={`relative cursor-pointer rounded-2xl overflow-hidden shadow-lg border-2 transition-all ${
          selected?._id===doc._id ? 'border-indigo-400 shadow-indigo-500/20' : 'border-white/10'}`}>
        <div className={`bg-gradient-to-br ${c.gradient} p-5 text-white`}>
          <div className="flex justify-between items-start mb-8">
            <div className="bg-white/20 backdrop-blur-sm rounded-xl p-2">{c.icon}</div>
            <span className={`text-xs px-2 py-0.5 rounded-full font-semibold border ${exp.cls}`}>{exp.label}</span>
          </div>
          {doc.photoUrl && (
            <img src={doc.photoUrl} alt="doc" className="absolute top-3 right-12 w-10 h-10 rounded-full object-cover border-2 border-white/50" />
          )}
          <p className="text-white/70 text-[10px] uppercase font-bold tracking-wider mb-1">{c.label}</p>
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
      <motion.div initial={{ opacity:0, x:20 }} animate={{ opacity:1, x:0 }} className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl shadow-xl overflow-hidden">
        {/* Header */}
        <div className={`bg-gradient-to-r ${c.gradient} p-6 text-white`}>
          <div className="flex justify-between items-start">
            <div>
              <p className="text-white/70 text-[10px] uppercase font-bold tracking-wider">{c.label}</p>
              <h2 className="text-2xl font-bold mt-1">{selected.country || selected.nationality || selected.bankName || 'Document'}</h2>
            </div>
            <div className="flex gap-2">
              <button onClick={openEdit} className="p-2 bg-white/25 hover:bg-white/35 border border-white/20 rounded-xl transition"><Edit className="h-4 w-4"/></button>
              <button onClick={() => setMode('delete')} className="p-2 bg-white/25 hover:bg-white/35 border border-white/20 rounded-xl transition"><Trash2 className="h-4 w-4"/></button>
            </div>
          </div>
          {/* Photo */}
          {selected.photoUrl ? (
            <img src={selected.photoUrl} alt="Document" className="mt-4 w-full h-40 object-cover rounded-xl border border-white/20 shadow-md" />
          ) : (
            <div className="mt-4 h-32 bg-white/10 rounded-xl flex items-center justify-center border-2 border-dashed border-white/20">
              <div className="text-center text-white/60"><Camera className="h-8 w-8 mx-auto mb-1"/><p className="text-xs">No photo added</p></div>
            </div>
          )}
        </div>

        <div className="p-6 space-y-4">
          {/* Status */}
          <div className={`flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-semibold border ${exp.cls}`}>
            {exp.label==='Valid' ? <CheckCircle className="h-4 w-4"/> : <AlertCircle className="h-4 w-4"/>}
            {exp.label} · Expires {new Date(selected.expiryDate).toLocaleDateString()}
          </div>

          {/* Core fields */}
          <div className="grid grid-cols-2 gap-4">
            <Field label="Document No." value={selected.number} icon={<Lock className="h-3 w-3 text-indigo-400"/>}/>
            <Field label="Expires" value={new Date(selected.expiryDate).toLocaleDateString()} icon={<Calendar className="h-3 w-3 text-indigo-400"/>}/>
            {selected.issueDate && <Field label="Issue Date" value={new Date(selected.issueDate).toLocaleDateString()} icon={<Calendar className="h-3 w-3 text-indigo-400"/>}/>}
            <Field label="Country" value={selected.country} icon={<Globe className="h-3 w-3 text-indigo-400"/>}/>
            <Field label="Nationality" value={selected.nationality} icon={<User className="h-3 w-3 text-indigo-400"/>}/>
            <Field label="Issued By" value={selected.issuer} icon={<Info className="h-3 w-3 text-indigo-400"/>}/>
            {/* Visa */}
            <Field label="Visa Type" value={selected.visaType} icon={<FileText className="h-3 w-3 text-indigo-400"/>}/>
            <Field label="Entries" value={selected.entries} icon={<Hash className="h-3 w-3 text-indigo-400"/>}/>
            {/* Card */}
            <Field label="Bank" value={selected.bankName} icon={<CreditCard className="h-3 w-3 text-indigo-400"/>}/>
            <Field label="Card Type" value={selected.cardType} icon={<CreditCard className="h-3 w-3 text-indigo-400"/>}/>
            {/* Vaccination */}
            <Field label="Vaccine" value={selected.vaccineType} icon={<Syringe className="h-3 w-3 text-indigo-400"/>}/>
            <Field label="Manufacturer" value={selected.manufacturer}/>
            <Field label="Lot No." value={selected.lotNumber} icon={<Hash className="h-3 w-3 text-indigo-400"/>}/>
            {/* Driving */}
            <Field label="License Class" value={selected.licenseClass} icon={<Car className="h-3 w-3 text-indigo-400"/>}/>
            {/* Insurance */}
            <Field label="Provider" value={selected.insuranceProvider} icon={<Shield className="h-3 w-3 text-indigo-400"/>}/>
            <Field label="Policy No." value={selected.policyNumber} icon={<Hash className="h-3 w-3 text-indigo-400"/>}/>
            <Field label="Coverage" value={selected.coverageAmount}/>
            <Field label="Emergency" value={selected.emergencyPhone} icon={<Phone className="h-3 w-3 text-indigo-400"/>}/>
          </div>

          {selected.doseDates && selected.doseDates.length > 0 && (
            <div>
              <p className="text-xs font-semibold text-gray-400 uppercase mb-2">Dose Dates</p>
              <div className="space-y-1">
                {selected.doseDates.map((d,i) => <p key={i} className="text-sm text-gray-300">Dose {i+1}: {new Date(d).toLocaleDateString()}</p>)}
              </div>
            </div>
          )}

          {selected.coverageDetails && (
            <div><p className="text-xs font-semibold text-gray-400 uppercase mb-1">Coverage Details</p>
            <p className="text-sm text-gray-300 bg-white/5 rounded-xl p-3 border border-white/10">{selected.coverageDetails}</p></div>
          )}

          {selected.embassy && (
            <div className="bg-indigo-500/10 border border-indigo-500/20 rounded-xl p-4">
              <p className="text-xs font-semibold text-indigo-400 uppercase mb-2">Embassy</p>
              <p className="font-semibold text-gray-100">{selected.embassy.name}</p>
              <div className="mt-2 space-y-1 text-sm text-gray-400">
                <p className="flex items-center gap-2"><MapPin className="h-3 w-3"/>{selected.embassy.address}</p>
                <p className="flex items-center gap-2"><Phone className="h-3 w-3"/>{selected.embassy.phone}</p>
                <p className="flex items-center gap-2"><Mail className="h-3 w-3"/>{selected.embassy.email}</p>
              </div>
            </div>
          )}

          {selected.notes && (
            <div><p className="text-xs font-semibold text-gray-400 uppercase mb-1">Notes</p>
            <p className="text-sm text-gray-300 bg-amber-500/5 rounded-xl p-3 border border-amber-500/10">{selected.notes}</p></div>
          )}
        </div>
      </motion.div>
    );
  };

  // ── Form ─────────────────────────────────────────────────────────────────
  const FormPanel = () => (
    <motion.div initial={{ opacity:0, x:20 }} animate={{ opacity:1, x:0 }} className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl shadow-xl overflow-hidden">
      <div className={`bg-gradient-to-r ${cfg(form.type as DocType || 'passport').gradient} p-6 text-white`}>
        <h2 className="text-xl font-bold">{mode==='edit' ? 'Edit Document' : 'Add New Document'}</h2>
        <p className="text-white/70 text-sm mt-1">Fill in the details for your document</p>
      </div>
      <div className="p-6 space-y-4 max-h-[65vh] overflow-y-auto">
        <style>{`
          @keyframes scan {
            0% { top: 0%; }
            50% { top: 100%; }
            100% { top: 0%; }
          }
        `}</style>

        {/* Photo upload / Scanner */}
        <div>
          <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Document Photo</label>
          <div onClick={() => fileRef.current?.click()}
            className="cursor-pointer border-2 border-dashed border-white/20 rounded-xl p-4 flex flex-col items-center hover:border-indigo-500/50 hover:bg-white/5 transition">
            {form.photoUrl ? (
              <div className="relative w-full">
                <img src={form.photoUrl} alt="preview" className="w-full h-32 object-cover rounded-lg border border-white/10"/>
                {isAnalyzingDoc && (
                  <div className="absolute inset-0 bg-slate-950/80 backdrop-blur-xs flex flex-col items-center justify-center rounded-lg">
                    <RefreshCw className="h-8 w-8 animate-spin text-indigo-400 mb-1" />
                    <p className="text-[10px] font-extrabold uppercase tracking-widest text-indigo-300 animate-pulse">Running AI OCR Scan...</p>
                    <div className="absolute left-0 right-0 h-0.5 bg-gradient-to-r from-transparent via-cyan-400 to-transparent top-0 animate-[scan_2s_ease-in-out_infinite]" />
                  </div>
                )}
              </div>
            ) : (
              <><Camera className="h-8 w-8 text-gray-400 mb-2"/><p className="text-sm text-gray-400">Click to upload document image</p></>
            )}
          </div>
          <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handlePhoto}/>

          {form.photoUrl && !isAnalyzingDoc && (
            <button
              type="button"
              onClick={handleOcrScan}
              className="mt-3 w-full py-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-bold rounded-xl text-xs flex items-center justify-center gap-1.5 shadow-md shadow-indigo-600/10 transition"
            >
              <Sparkles className="h-3.5 w-3.5 text-indigo-200" />
              <span>Autofill Form with AI OCR Scan</span>
            </button>
          )}
        </div>

        {/* Type */}
        <div>
          <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1">Document Type</label>
          <select name="type" value={form.type||'passport'} onChange={handleChange}
            className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-xl text-sm text-gray-200 focus:border-indigo-500 outline-none transition">
            {Object.entries(DOC_CONFIG).map(([k,v]) => <option key={k} value={k} className="bg-gray-900 text-gray-200">{v.label}</option>)}
          </select>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <Input label="Document Number *" name="number" value={form.number||''} onChange={handleChange} placeholder="e.g. A1234567"/>
          <Input label="Expiry Date *" name="expiryDate" type="date" value={form.expiryDate||''} onChange={handleChange}/>
          <Input label="Issue Date" name="issueDate" type="date" value={form.issueDate||''} onChange={handleChange}/>
          <Input label="Country" name="country" value={form.country||''} onChange={handleChange} placeholder="India"/>
          <Input label="Nationality" name="nationality" value={form.nationality||''} onChange={handleChange} placeholder="Indian"/>
          <Input label="Issued By" name="issuer" value={form.issuer||''} onChange={handleChange} placeholder="Passport Office"/>
        </div>

        {(form.type==='visa') && (
          <div className="grid grid-cols-2 gap-3">
            <Input label="Visa Type" name="visaType" value={form.visaType||''} onChange={handleChange} placeholder="Tourist / Business"/>
            <Input label="Entries" name="entries" value={form.entries||''} onChange={handleChange} placeholder="Single / Multiple"/>
          </div>
        )}
        {form.type==='creditCard' && (
          <div className="grid grid-cols-2 gap-3">
            <Input label="Bank Name" name="bankName" value={form.bankName||''} onChange={handleChange} placeholder="HDFC / Chase"/>
            <Input label="Card Type" name="cardType" value={form.cardType||''} onChange={handleChange} placeholder="Visa / Mastercard"/>
          </div>
        )}
        {form.type==='vaccination' && (
          <div className="grid grid-cols-2 gap-3">
            <Input label="Vaccine Name" name="vaccineType" value={form.vaccineType||''} onChange={handleChange} placeholder="COVID-19 / Yellow Fever"/>
            <Input label="Manufacturer" name="manufacturer" value={form.manufacturer||''} onChange={handleChange} placeholder="AstraZeneca"/>
            <Input label="Lot Number" name="lotNumber" value={form.lotNumber||''} onChange={handleChange} placeholder="4120Z001"/>
          </div>
        )}
        {form.type==='drivingLicense' && (
          <Input label="License Class" name="licenseClass" value={form.licenseClass||''} onChange={handleChange} placeholder="LMV / Class D"/>
        )}
        {form.type==='insurance' && (
          <div className="grid grid-cols-2 gap-3">
            <Input label="Provider" name="insuranceProvider" value={form.insuranceProvider||''} onChange={handleChange} placeholder="Allianz / Star Health"/>
            <Input label="Policy Number" name="policyNumber" value={form.policyNumber||''} onChange={handleChange}/>
            <Input label="Coverage Amount" name="coverageAmount" value={form.coverageAmount||''} onChange={handleChange} placeholder="e.g. $50,000"/>
            <Input label="Emergency Phone" name="emergencyPhone" value={form.emergencyPhone||''} onChange={handleChange} placeholder="Emergency contact"/>
          </div>
        )}

        {/* Notes */}
        <div>
          <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1">Notes</label>
          <textarea name="notes" value={form.notes||''} onChange={handleChange} rows={2}
            placeholder="Add any specific details or restrictions..."
            className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-xl text-sm text-white placeholder-gray-500 focus:border-indigo-500 outline-none resize-none transition"/>
        </div>

        <div className="flex gap-3 pt-2">
          <button onClick={() => { setMode('view'); setForm(emptyForm()); }}
            className="flex-1 py-2.5 border border-white/10 rounded-xl text-gray-300 hover:bg-white/5 text-sm transition">Cancel</button>
          <button onClick={save}
            className={`flex-1 py-2.5 rounded-xl text-white text-sm font-bold transition bg-gradient-to-r ${cfg(form.type as DocType||'passport').gradient} hover:opacity-90`}>
            {mode==='edit' ? 'Update Details' : 'Add Document'}
          </button>
        </div>
      </div>
    </motion.div>
  );

  return (
    <div className="min-h-screen bg-slate-950 py-10 px-4 sm:px-6">
      {/* Header */}
      <div className="max-w-6xl mx-auto mb-8">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-extrabold flex items-center gap-2 bg-gradient-to-r from-blue-400 to-indigo-400 bg-clip-text text-transparent">
              <Shield className="h-8 w-8 text-indigo-400" /> Travel Wallet & Eligibility Engine
            </h1>
            <p className="text-gray-400 mt-1 text-sm">
              Securely store documents, extract data automatically, and check your global readiness metrics.
            </p>
          </div>
          
          <div className="flex items-center gap-3">
            {/* Tab switchers */}
            <div className="flex bg-white/5 border border-white/10 p-1.5 rounded-2xl">
              <button
                onClick={() => setActiveTab('wallet')}
                className={`px-4 py-2 text-xs font-bold rounded-xl transition ${activeTab === 'wallet' ? 'bg-indigo-600/30 text-indigo-300 border border-indigo-500/30' : 'text-gray-400 hover:text-gray-200'}`}
              >
                Secured Wallet
              </button>
              <button
                onClick={() => setActiveTab('readiness')}
                className={`px-4 py-2 text-xs font-bold rounded-xl transition ${activeTab === 'readiness' ? 'bg-indigo-600/30 text-indigo-300 border border-indigo-500/30' : 'text-gray-400 hover:text-gray-200'}`}
              >
                AI Eligibility Check
              </button>
            </div>
            
            {activeTab === 'wallet' && (
              <motion.button whileHover={{ scale:1.03 }} whileTap={{ scale:0.97 }} onClick={openAdd}
                className="flex items-center gap-1.5 bg-gradient-to-r from-blue-600 to-indigo-600 text-white px-4 py-2 rounded-xl font-bold text-xs shadow-lg shadow-indigo-600/10 hover:from-blue-700 hover:to-indigo-700 transition">
                <Plus className="h-4 w-4"/> Add Document
              </motion.button>
            )}
          </div>
        </div>
      </div>

      {activeTab === 'wallet' ? (
        // ── WALLET TAB CONTENT ──────────────────────────────────────────────────
        <div className="max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-5 gap-6">
          {/* Left: documents list */}
          <div className="lg:col-span-2 space-y-4">
            {loading && (
              <div className="flex justify-center py-10">
                <RefreshCw className="h-8 w-8 text-indigo-400 animate-spin" />
              </div>
            )}
            {error && (
              <div className="p-4 bg-rose-500/10 border border-rose-500/20 text-rose-300 rounded-xl text-sm flex items-center gap-2">
                <AlertCircle className="h-5 w-5" />
                <span>{error}</span>
              </div>
            )}
            {documents.length === 0 && !loading ? (
              <div className="text-center py-16 bg-white/5 border border-white/10 rounded-2xl text-gray-400">
                <Lock className="h-12 w-12 mx-auto mb-3 opacity-30"/>
                <p className="font-semibold text-gray-300">No documents secured yet</p>
                <p className="text-xs opacity-60 mt-1">Add passports, visas, and health certificates to get started.</p>
              </div>
            ) : (
              documents.map(doc => <DocCard key={doc._id} doc={doc}/>)
            )}
          </div>

          {/* Right: detail panel or form panel */}
          <div className="lg:col-span-3">
            <AnimatePresence mode="wait">
              {(mode==='add'||mode==='edit') ? (
                <FormPanel key="form"/>
              ) : mode==='delete' && selected ? (
                <motion.div key="del" initial={{ opacity:0 }} animate={{ opacity:1 }} exit={{ opacity:0 }}
                  className="bg-white/5 border border-white/10 rounded-2xl shadow-xl p-8 text-center backdrop-blur-xl">
                  <div className="bg-rose-500/15 p-4 rounded-full inline-flex mb-4 border border-rose-500/20"><Trash2 className="h-8 w-8 text-rose-400"/></div>
                  <h3 className="text-xl font-bold text-gray-100 mb-2">Delete Document?</h3>
                  <p className="text-gray-400 text-sm mb-6">This will permanently remove your <strong>{cfg(selected.type).label}</strong>. This cannot be undone.</p>
                  <div className="flex gap-3 justify-center">
                    <button onClick={() => setMode('view')} className="px-6 py-2 border border-white/10 rounded-xl text-gray-300 hover:bg-white/5 transition text-sm font-semibold">Cancel</button>
                    <button onClick={del} className="px-6 py-2 bg-rose-600 text-white rounded-xl hover:bg-rose-700 transition text-sm font-bold shadow-md shadow-rose-600/10">Delete</button>
                  </div>
                </motion.div>
              ) : selected ? (
                <DetailPanel key={selected._id}/>
              ) : (
                <motion.div key="empty" initial={{ opacity:0 }} animate={{ opacity:1 }}
                  className="h-full flex flex-col items-center justify-center text-center py-20 bg-white/5 backdrop-blur-xl rounded-2xl border border-white/10">
                  <CreditCard className="h-16 w-16 text-indigo-400 mb-4 opacity-50"/>
                  <p className="text-white font-semibold text-lg">Select a Document</p>
                  <p className="text-gray-400 text-sm mt-1">Click any secure card on the left to expand details</p>
                  <motion.button whileHover={{ scale:1.05 }} onClick={openAdd}
                    className="mt-6 flex items-center gap-1.5 bg-gradient-to-r from-blue-600 to-indigo-600 text-white px-5 py-2.5 rounded-xl text-xs font-bold transition shadow-lg shadow-indigo-600/15">
                    <Plus className="h-4 w-4"/> Add Your First Document
                  </motion.button>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      ) : (
        // ── READINESS TAB CONTENT ────────────────────────────────────────────────
        <div className="max-w-6xl mx-auto space-y-6">
          {/* Trip selector bar */}
          <div className="bg-white/5 backdrop-blur-xl border border-white/10 p-6 rounded-2xl shadow-xl flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <Globe className="h-6 w-6 text-indigo-400 shrink-0" />
              <div>
                <h3 className="font-bold text-gray-200">Verify Travel Eligibility</h3>
                <p className="text-xs text-gray-400">Select a trip to audit stored documents against destination entry rules.</p>
              </div>
            </div>
            
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
              <select
                value={selectedTripId}
                onChange={(e) => setSelectedTripId(e.target.value)}
                className="px-4 py-2.5 bg-white/5 border border-white/10 rounded-xl text-gray-200 outline-none focus:border-indigo-400 transition min-w-[240px] text-sm"
              >
                {trips.map((t) => (
                  <option key={t._id} value={t._id} className="bg-gray-900 text-gray-200">
                    {t.destination} ({t.duration})
                  </option>
                ))}
                {trips.length === 0 && (
                  <option value="" className="bg-gray-900 text-gray-400">No trips available</option>
                )}
              </select>

              <button
                type="button"
                onClick={handleCheckEligibility}
                disabled={isCheckingReadiness || !selectedTripId}
                className="py-2.5 px-6 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-bold rounded-xl text-sm flex items-center justify-center gap-1.5 shadow-lg shadow-indigo-600/15 transition disabled:opacity-50"
              >
                {isCheckingReadiness ? (
                  <>
                    <RefreshCw className="h-4 w-4 animate-spin" />
                    <span>Analyzing Readiness...</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="h-4 w-4 text-indigo-200" />
                    <span>Audit Eligibility</span>
                  </>
                )}
              </button>
            </div>
          </div>

          {readinessError && (
            <div className="p-4 bg-rose-500/10 border border-rose-500/20 text-rose-300 rounded-xl text-sm flex items-center gap-2">
              <AlertCircle className="h-5 w-5 shrink-0" />
              <span>{readinessError}</span>
            </div>
          )}

          {isCheckingReadiness && (
            <div className="bg-white/5 border border-white/10 rounded-2xl p-16 text-center shadow-xl backdrop-blur-xl relative overflow-hidden">
              <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-cyan-400 to-transparent animate-[scan_2s_infinite]" />
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
                className="inline-block p-4 bg-indigo-600/10 border border-indigo-500/20 rounded-full mb-4 text-indigo-400"
              >
                <RefreshCw className="h-10 w-10" />
              </motion.div>
              <h3 className="text-xl font-bold text-gray-200">Evaluating Readiness Metrics</h3>
              <p className="text-sm text-gray-400 max-w-sm mx-auto mt-2 leading-relaxed">
                Consulting global immigration policies, checking document expiration dates, and auditing visa entry criteria...
              </p>
            </div>
          )}

          {!readinessData && !isCheckingReadiness && (
            <div className="bg-white/5 border border-white/10 rounded-2xl py-20 px-6 text-center shadow-xl backdrop-blur-xl flex flex-col items-center justify-center">
              <ShieldAlert className="h-12 w-12 text-indigo-400/50 mb-4" />
              <h3 className="text-lg font-bold text-gray-200">No Readiness Audit Performed</h3>
              <p className="text-sm text-gray-400 max-w-sm mx-auto mt-2 leading-relaxed">
                Choose an upcoming adventure from the selector above and click "Audit Eligibility" to trigger the intelligence engine.
              </p>
            </div>
          )}

          {readinessData && !isCheckingReadiness && (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Left Column: Gauge and Status */}
              <div className="lg:col-span-1 space-y-6">
                {/* Score Gauge Card */}
                <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-6 shadow-xl relative overflow-hidden flex flex-col items-center justify-center text-center">
                  <h3 className="font-extrabold text-sm text-gray-400 uppercase tracking-wider mb-6">Readiness Score</h3>
                  
                  <div className="relative flex items-center justify-center mb-6">
                    <svg className="w-36 h-36 transform -rotate-90">
                      <circle
                        cx="72"
                        cy="72"
                        r={radius}
                        stroke="rgba(255,255,255,0.05)"
                        strokeWidth="8"
                        fill="transparent"
                      />
                      <circle
                        cx="72"
                        cy="72"
                        r={radius}
                        stroke={
                          readinessData.readinessScore >= 80 ? '#10b981' :
                          readinessData.readinessScore >= 50 ? '#f59e0b' : '#f43f5e'
                        }
                        strokeWidth="8"
                        fill="transparent"
                        strokeDasharray={circumference}
                        strokeDashoffset={circumference - (readinessData.readinessScore / 100) * circumference}
                        strokeLinecap="round"
                        className="transition-all duration-1000 ease-out"
                      />
                    </svg>
                    <div className="absolute inset-0 flex flex-col items-center justify-center">
                      <span className="text-4xl font-black text-white">{readinessData.readinessScore}%</span>
                      <span className="text-[10px] uppercase font-bold tracking-widest text-gray-400 mt-0.5">COMPLIANT</span>
                    </div>
                  </div>

                  <div className="w-full pt-4 border-t border-white/5">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-gray-400 font-medium">Immigration Confidence:</span>
                      <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold border ${
                        readinessData.confidenceScore === 'High' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' :
                        readinessData.confidenceScore === 'Medium' ? 'bg-amber-500/10 text-amber-400 border-amber-500/20' :
                        'bg-rose-500/10 text-rose-400 border-rose-500/20'
                      }`}>
                        {readinessData.confidenceScore}
                      </span>
                    </div>
                    <p className="text-xs text-gray-400 mt-2.5 leading-relaxed text-left">
                      {readinessData.confidenceReason}
                    </p>
                  </div>
                </div>

                {/* Country Entry Regulations */}
                <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-6 shadow-xl space-y-4">
                  <h3 className="font-extrabold text-sm text-gray-200 flex items-center gap-1.5 border-b border-white/5 pb-3">
                    <Globe className="h-4.5 w-4.5 text-indigo-400" /> Country Entry Rules
                  </h3>
                  <ul className="space-y-2.5">
                    {readinessData.destinationRules.map((rule, idx) => (
                      <li key={idx} className="flex items-start gap-2 text-xs text-gray-300 leading-relaxed">
                        <span className="text-indigo-400 font-bold shrink-0 mt-0.5">•</span>
                        <span>{rule}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                {/* Transit Visa Rules */}
                {readinessData.transitAdvice && readinessData.transitAdvice.length > 0 && (
                  <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-6 shadow-xl space-y-4">
                    <h3 className="font-extrabold text-sm text-gray-200 flex items-center gap-1.5 border-b border-white/5 pb-3">
                      <Shield className="h-4.5 w-4.5 text-indigo-400" /> Transit Guidance
                    </h3>
                    <ul className="space-y-2.5">
                      {readinessData.transitAdvice.map((advice, idx) => (
                        <li key={idx} className="flex items-start gap-2 text-xs text-gray-300 leading-relaxed">
                          <span className="text-indigo-400 font-bold shrink-0 mt-0.5">•</span>
                          <span>{advice}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>

              {/* Right Column: Alerts and Document Checklist */}
              <div className="lg:col-span-2 space-y-6">
                {/* Active Alerts List */}
                {readinessData.alerts && readinessData.alerts.length > 0 && (
                  <div className="space-y-3">
                    {readinessData.alerts.map((alert, idx) => (
                      <div
                        key={idx}
                        className={`p-4 border rounded-xl flex items-start gap-3 shadow-md ${
                          alert.type === 'danger' ? 'bg-rose-500/10 border-rose-500/20 text-rose-300' :
                          alert.type === 'warning' ? 'bg-amber-500/10 border-amber-500/20 text-amber-300' :
                          'bg-blue-500/10 border-blue-500/20 text-blue-300'
                        }`}
                      >
                        <ShieldAlert className="h-5 w-5 shrink-0 mt-0.5" />
                        <div className="text-xs font-semibold leading-relaxed">
                          {alert.message}
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {/* Document Audit Checklist */}
                <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-6 shadow-xl space-y-5">
                  <div>
                    <h3 className="font-bold text-gray-200">Travel Document Audit</h3>
                    <p className="text-xs text-gray-400 mt-0.5">Audited compliance list based on your wallet records.</p>
                  </div>
                  
                  <div className="divide-y divide-white/5">
                    {readinessData.requirements.map((req, idx) => (
                      <div key={idx} className="py-3.5 flex items-start justify-between gap-4 first:pt-0 last:pb-0">
                        <div className="flex gap-3">
                          <div className={`mt-0.5 p-1 rounded-lg border ${
                            req.status === 'verified' ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400' :
                            req.status === 'warning' ? 'bg-amber-500/10 border-amber-500/20 text-amber-400' :
                            'bg-rose-500/10 border-rose-500/20 text-rose-400'
                          }`}>
                            {req.status === 'verified' ? <Check className="h-4 w-4" /> : <AlertCircle className="h-4 w-4" />}
                          </div>
                          <div>
                            <p className="text-sm font-bold text-gray-200">{req.name}</p>
                            <p className="text-xs text-gray-400 mt-0.5">{req.details}</p>
                          </div>
                        </div>
                        
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                          req.status === 'verified' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' :
                          req.status === 'warning' ? 'bg-amber-500/10 text-amber-400 border-amber-500/20' :
                          'bg-rose-500/10 text-rose-400 border-rose-500/20'
                        }`}>
                          {req.status === 'verified' ? 'VERIFIED' : req.status === 'warning' ? 'WARN' : 'MISSING'}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}