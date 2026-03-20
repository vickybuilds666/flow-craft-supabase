import { useCallback, useState, useEffect } from 'react';
import ReactFlow, {
  MiniMap,
  Controls,
  Background,
  useNodesState,
  useEdgesState,
  addEdge,
  Connection,
  Edge,
  Node,
  NodeProps,
  BackgroundVariant,
  Handle,
  Position,
  useReactFlow,
  ReactFlowProvider,
} from 'reactflow';
import 'reactflow/dist/style.css';
import { useAuth } from '../contexts/AuthContext';
import { supabase, Flow } from '../lib/supabase';
import { Save, FolderOpen, LogOut, Plus, Trash2, CheckCircle, XCircle, Sparkles, Loader } from 'lucide-react';

function RectangleNode({ data, selected }: NodeProps) {
  return (
    <div style={{ padding: '10px 20px', borderRadius: '6px', minWidth: '120px', border: `2px solid ${selected ? '#3b82f6' : '#475569'}`, background: selected ? '#1e3a5f' : '#1e293b', color: '#f1f5f9', fontSize: '13px', fontWeight: 500, textAlign: 'center' }}>
      <Handle type="target" position={Position.Top} style={{ background: '#3b82f6' }} />
      {data.label}
      <Handle type="source" position={Position.Bottom} style={{ background: '#3b82f6' }} />
    </div>
  );
}

function DiamondNode({ data, selected }: NodeProps) {
  return (
    <div style={{ position: 'relative', width: '130px', height: '85px' }}>
      <Handle type="target" position={Position.Top} style={{ background: '#f59e0b', zIndex: 2 }} />
      <div style={{ width: '90px', height: '90px', background: selected ? '#451a03' : '#1c1917', border: `2px solid ${selected ? '#f59e0b' : '#92400e'}`, transform: 'rotate(45deg)', position: 'absolute', top: '-2px', left: '18px' }} />
      <div style={{ position: 'absolute', top: 0, left: 0, width: '130px', height: '85px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fde68a', fontSize: '12px', fontWeight: 600, textAlign: 'center', padding: '0 20px', zIndex: 1 }}>
        {data.label}
      </div>
      <Handle type="source" position={Position.Bottom} style={{ background: '#f59e0b', zIndex: 2 }} />
    </div>
  );
}

function CircleNode({ data, selected }: NodeProps) {
  return (
    <div style={{ width: '90px', height: '90px', borderRadius: '50%', border: `2px solid ${selected ? '#22c55e' : '#166534'}`, background: selected ? '#14532d' : '#0f172a', color: '#86efac', fontSize: '12px', fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', textAlign: 'center', padding: '8px' }}>
      <Handle type="target" position={Position.Top} style={{ background: '#22c55e' }} />
      {data.label}
      <Handle type="source" position={Position.Bottom} style={{ background: '#22c55e' }} />
    </div>
  );
}

function ParallelogramNode({ data, selected }: NodeProps) {
  return (
    <div style={{ padding: '10px 28px', minWidth: '120px', textAlign: 'center', background: selected ? '#1e1b4b' : '#0f172a', border: `2px solid ${selected ? '#818cf8' : '#3730a3'}`, color: '#c7d2fe', fontSize: '13px', transform: 'skewX(-15deg)' }}>
      <Handle type="target" position={Position.Top} style={{ background: '#818cf8' }} />
      <span style={{ display: 'inline-block', transform: 'skewX(15deg)' }}>{data.label}</span>
      <Handle type="source" position={Position.Bottom} style={{ background: '#818cf8' }} />
    </div>
  );
}

const nodeTypes = { rectangle: RectangleNode, diamond: DiamondNode, circle: CircleNode, parallelogram: ParallelogramNode };

const NODE_OPTIONS = [
  { type: 'rectangle', emoji: '▭', name: 'Process', color: '#3b82f6' },
  { type: 'diamond', emoji: '◇', name: 'Decision', color: '#f59e0b' },
  { type: 'circle', emoji: '○', name: 'Start/End', color: '#22c55e' },
  { type: 'parallelogram', emoji: '▱', name: 'Input/Out', color: '#818cf8' },
];

function NodeTypePicker({ onSelect, onClose }: { onSelect: (t: string) => void; onClose: () => void }) {
  return (
    <>
      <div onClick={onClose} style={{ position: 'fixed', inset: 0, zIndex: 40 }} />
      <div style={{ position: 'absolute', top: '40px', left: 0, background: '#1e293b', border: '1px solid #334155', borderRadius: '12px', padding: '10px', zIndex: 50, display: 'flex', gap: '6px', boxShadow: '0 8px 32px rgba(0,0,0,0.5)' }}>
        {NODE_OPTIONS.map(opt => (
          <button key={opt.type} onClick={() => { onSelect(opt.type); onClose(); }} style={{ padding: '8px 12px', borderRadius: '8px', border: '1px solid #334155', background: '#0f172a', color: '#f8fafc', cursor: 'pointer', textAlign: 'center', fontSize: '11px', minWidth: '64px' }}>
            <div style={{ fontSize: '18px', color: opt.color, marginBottom: '3px' }}>{opt.emoji}</div>
            <div style={{ fontWeight: 600 }}>{opt.name}</div>
          </button>
        ))}
      </div>
    </>
  );
}

function AIPanel({ onGenerate, onClose, generating }: { onGenerate: (p: string) => void; onClose: () => void; generating: boolean }) {
  const [prompt, setPrompt] = useState('');
  const examples = ['User login flow', 'E-commerce checkout', 'Bug reporting process', 'Employee onboarding'];
  return (
    <>
      <div onClick={onClose} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 40 }} />
      <div style={{ position: 'fixed', bottom: '24px', left: '50%', transform: 'translateX(-50%)', width: '320px', background: '#0f172a', border: '1px solid #334155', borderRadius: '16px', padding: '20px', zIndex: 50, boxShadow: '0 16px 48px rgba(0,0,0,0.6)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
          <span style={{ color: '#f8fafc', fontWeight: 700, fontSize: '15px' }}><Sparkles size={16} color="#a78bfa" /> AI Flow Generator</span>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: '#64748b', fontSize: '20px', cursor: 'pointer' }}>x</button>
        </div>
        <textarea value={prompt} onChange={e => setPrompt(e.target.value)} placeholder="Describe your flow..." style={{ width: '100%', height: '85px', padding: '10px 12px', borderRadius: '8px', border: '1px solid #334155', background: '#1e293b', color: '#f8fafc', fontSize: '13px', resize: 'none', outline: 'none', fontFamily: 'inherit', boxSizing: 'border-box' }} />
        <div style={{ marginTop: '10px', marginBottom: '12px' }}>
          <div style={{ color: '#64748b', fontSize: '11px', marginBottom: '5px' }}>Quick examples:</div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '5px' }}>
            {examples.map(ex => (
              <button key={ex} onClick={() => setPrompt(ex)} style={{ padding: '3px 9px', borderRadius: '20px', border: '1px solid #334155', background: '#1e293b', color: '#94a3b8', fontSize: '11px', cursor: 'pointer' }}>{ex}</button>
            ))}
          </div>
        </div>
        <button onClick={() => prompt.trim() && onGenerate(prompt)} disabled={!prompt.trim() || generating} style={{ width: '100%', padding: '10px', borderRadius: '8px', border: 'none', background: !prompt.trim() || generating ? '#334155' : 'linear-gradient(135deg, #7c3aed, #4f46e5)', color: '#fff', fontSize: '14px', fontWeight: 600, cursor: !prompt.trim() || generating ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '7px' }}>
          {generating ? <><Loader size={15} style={{ animation: 'spin 1s linear infinite' }} /> Generating...</> : <><Sparkles size={15} /> Generate Flow</>}
        </button>
      </div>
    </>
  );
}

function Toast({ message, type }: { message: string; type: 'success' | 'error' }) {
  return (
    <div style={{ position: 'fixed', bottom: '24px', left: '50%', transform: 'translateX(-50%)', zIndex: 9999, display: 'flex', alignItems: 'center', gap: '8px', padding: '12px 20px', borderRadius: '10px', background: type === 'success' ? '#166534' : '#991b1b', color: '#fff', fontSize: '14px', fontWeight: 600, boxShadow: '0 8px 24px rgba(0,0,0,0.3)' }}>
      {type === 'success' ? <CheckCircle size={16} /> : <XCircle size={16} />}
      {message}
    </div>
  );
}

function btn(bg: string, border: string, color = '#f1f5f9') {
  return { display: 'flex' as const, alignItems: 'center' as const, gap: '5px', padding: '6px 11px', borderRadius: '7px', border: `1px solid ${border}`, background: bg, color, fontSize: '12px', fontWeight: 600, cursor: 'pointer', whiteSpace: 'nowrap' as const };
}

const initialNodes: Node[] = [
  { id: '1', type: 'circle', data: { label: 'Start' }, position: { x: 150, y: 150 } },
];

function FlowEditorInner() {
  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);
  const [flowName, setFlowName] = useState('Untitled Flow');
  const [currentFlowId, setCurrentFlowId] = useState<string | null>(null);
  const [flows, setFlows] = useState<Flow[]>([]);
  const [showLoadMenu, setShowLoadMenu] = useState(false);
  const [showNodePicker, setShowNodePicker] = useState(false);
  const [showAIPanel, setShowAIPanel] = useState(false);
  const [saving, setSaving] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
  const { signOut, user } = useAuth();
  const { fitView } = useReactFlow();

  const showToast = (message: string, type: 'success' | 'error') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 2500);
  };

  const onConnect = useCallback((params: Connection | Edge) => setEdges(eds => addEdge(params, eds)), [setEdges]);

  const loadFlows = async () => {
    const { data, error } = await supabase.from('flows').select('*').order('updated_at', { ascending: false });
    if (!error && data) setFlows(data);
  };

  useEffect(() => {
    const autoLoad = async () => {
      const { data, error } = await supabase.from('flows').select('*').order('updated_at', { ascending: false }).limit(1).maybeSingle();
      if (!error && data) {
        setNodes(data.data.nodes || []);
        setEdges(data.data.edges || []);
        setFlowName(data.name);
        setCurrentFlowId(data.id);
      }
    };
    autoLoad();
    loadFlows();
  }, []);

  useEffect(() => {
    const hk = (e: KeyboardEvent) => { if ((e.ctrlKey || e.metaKey) && e.key === 's') { e.preventDefault(); handleSave(); } };
    window.addEventListener('keydown', hk);
    return () => window.removeEventListener('keydown', hk);
  }, [nodes, edges, flowName, currentFlowId, user]);

  const handleSave = async () => {
    if (!user) return;
    setSaving(true);
    const flowData = { nodes, edges };
    if (currentFlowId) {
      const { error } = await supabase.from('flows').update({ name: flowName, data: flowData, updated_at: new Date().toISOString() }).eq('id', currentFlowId);
      if (!error) { await loadFlows(); showToast('Flow saved!', 'success'); } else showToast('Save failed!', 'error');
    } else {
      const { data, error } = await supabase.from('flows').insert({ user_id: user.id, name: flowName, data: flowData }).select().maybeSingle();
      if (!error && data) { setCurrentFlowId(data.id); await loadFlows(); showToast('Flow saved!', 'success'); } else showToast('Save failed!', 'error');
    }
    setSaving(false);
  };

  const handleLoad = (flow: Flow) => {
    setNodes(flow.data.nodes || []);
    setEdges(flow.data.edges || []);
    setFlowName(flow.name);
    setCurrentFlowId(flow.id);
    setShowLoadMenu(false);
  };

  const handleDelete = async (flowId: string) => {
    await supabase.from('flows').delete().eq('id', flowId);
    await loadFlows();
    if (currentFlowId === flowId) { setCurrentFlowId(null); setFlowName('Untitled Flow'); setNodes(initialNodes); setEdges([]); }
  };

  const handleNew = () => { setCurrentFlowId(null); setFlowName('Untitled Flow'); setNodes(initialNodes); setEdges([]); };

  const addNode = (type: string = 'rectangle') => {
    const labels: Record<string, string> = { rectangle: 'Process', diamond: 'Decision?', circle: 'Start/End', parallelogram: 'Input/Output' };
    setNodes(nds => [...nds, { id: `${Date.now()}`, type, data: { label: labels[type] || 'Node' }, position: { x: 150, y: 150 } }]);
  };

  const handleAIGenerate = async (prompt: string) => {
    setGenerating(true);
    setShowAIPanel(false);
    try {
      const response = await fetch('/.netlify/functions/generate-flow', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ prompt }) });
      const parsed = await response.json();
      const fixedNodes = (parsed.nodes || []).map((n: Node, i: number) => ({ ...n, position: { x: 150, y: 50 + i * 120 } }));
      setNodes(fixedNodes);
      setEdges(parsed.edges || []);
      setFlowName(parsed.flowName || prompt);
      setCurrentFlowId(null);
      showToast('AI flow generated!', 'success');
      setTimeout(() => fitView({ padding: 0.3, duration: 800 }), 500);
    } catch (err) {
      showToast('AI generation failed!', 'error');
    }
    setGenerating(false);
  };

  const onNodeDoubleClick = useCallback((_: React.MouseEvent, node: Node) => {
    const newLabel = window.prompt('Edit label:', node.data.label);
    if (newLabel !== null && newLabel.trim()) {
      setNodes(nds => nds.map(n => n.id === node.id ? { ...n, data: { ...n.data, label: newLabel.trim() } } : n));
    }
  }, [setNodes]);

  return (
    <div style={{ height: '100vh', display: 'flex', flexDirection: 'column', background: '#020617' }}>
      <header style={{ background: '#0f172a', borderBottom: '1px solid #1e293b', padding: '10px 14px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
          <span style={{ fontWeight: 800, color: '#f8fafc', fontSize: '17px', marginRight: '4px' }}>FLOW.CRAFT</span>
          <input type="text" value={flowName} onChange={e => setFlowName(e.target.value)} style={{ background: '#1e293b', border: '1px solid #334155', borderRadius: '7px', padding: '5px 10px', color: '#f8fafc', fontSize: '12px', outline: 'none', width: '130px' }} />
          <button onClick={handleNew} style={btn('#1e293b', '#334155')}><Plus size={13} /> New</button>
          <div style={{ position: 'relative' }}>
            <button onClick={() => setShowNodePicker(p => !p)} style={btn('#1e293b', '#334155')}><Plus size={13} /> Add Node</button>
            {showNodePicker && <NodeTypePicker onSelect={addNode} onClose={() => setShowNodePicker(false)} />}
          </div>
          <button onClick={() => setShowAIPanel(true)} disabled={generating} style={btn('#2e1065', '#7c3aed', '#e9d5ff')}>
            {generating ? <Loader size={13} style={{ animation: 'spin 1s linear infinite' }} /> : <Sparkles size={13} />}
            {generating ? 'Generating...' : 'AI Generate'}
          </button>
          <button onClick={handleSave} disabled={saving} style={btn('#14532d', '#16a34a')}><Save size={13} /> {saving ? 'Saving...' : 'Save'}</button>
          <button onClick={() => { setShowLoadMenu(p => !p); loadFlows(); }} style={btn('#1e3a8a', '#2563eb')}><FolderOpen size={13} /> Load</button>
          <button onClick={signOut} style={btn('#7f1d1d', '#dc2626')}><LogOut size={13} /> Out</button>
        </div>
        <div style={{ display: 'flex', gap: '10px', marginTop: '7px', flexWrap: 'wrap' }}>
          {NODE_OPTIONS.map(opt => (
            <span key={opt.type} style={{ fontSize: '10px', color: opt.color }}>{opt.emoji} {opt.name}</span>
          ))}
          <span style={{ fontSize: '10px', color: '#475569' }}>Double-tap to edit</span>
        </div>
      </header>

      <div style={{ flex: 1, position: 'relative' }}>
      <ReactFlow nodes={nodes} edges={edges} onNodesChange={onNodesChange} onEdgesChange={onEdgesChange} onConnect={onConnect} onNodeDoubleClick={onNodeDoubleClick} nodeTypes={nodeTypes} fitView={false} defaultViewport={{ x: 0, y: 0, zoom: 0.5 }} minZoom={0.1}>
          <Controls />
          <MiniMap nodeColor={n => n.type === 'diamond' ? '#f59e0b' : n.type === 'circle' ? '#22c55e' : n.type === 'parallelogram' ? '#818cf8' : '#3b82f6'} style={{ background: '#1e293b', border: '1px solid #334155' }} />
          <Background variant={BackgroundVariant.Dots} gap={16} size={1} color="#1e293b" />
        </ReactFlow>

        {showLoadMenu && (
          <div style={{ position: 'absolute', top: '12px', right: '12px', background: '#0f172a', border: '1px solid #1e293b', borderRadius: '12px', padding: '14px', width: '270px', maxHeight: '370px', overflowY: 'auto', zIndex: 50, boxShadow: '0 8
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '10px' }}>
              <span style={{ color: '#f8fafc', fontWeight: 700, fontSize: '13px' }}>Your Flows</span>
              <button onClick={() => setShowLoadMenu(false)} style={{ background: 'none', border: 'none', color: '#64748b', cursor: 'pointer', fontSize: '18px' }}>x</button>
            </div>
            {flows.length === 0
              ? <p style={{ color: '#475569', fontSize: '12px', textAlign: 'center', padding: '16px 0' }}>No saved flows yet</p>
              : flows.map(flow => (
                <div key={flow.id} style={{ display: 'flex', alignItems: 'center', padding: '9px 10px', borderRadius: '8px', marginBottom: '5px', border: `1px solid ${currentFlowId === flow.id ? '#3b82f6' : '#1e293b'}`, background: currentFlowId === flow.id ? '#1e3a5f' : '#1e293b', cursor: 'pointer' }}>
                  <div onClick={() => handleLoad(flow)} style={{ flex: 1 }}>
                    <div style={{ color: '#f1f5f9', fontWeight: 600, fontSize: '12px' }}>{flow.name}</div>
                    <div style={{ color: '#475569', fontSize: '10px', marginTop: '2px' }}>{new Date(flow.updated_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}</div>
                  </div>
                  <button onClick={() => handleDelete(flow.id)} style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', padding: '4px' }}><Trash2 size={13} /></button>
                </div>
              ))
            }
          </div>
        )}
      </div>

      {showAIPanel && <AIPanel onGenerate={handleAIGenerate} onClose={() => setShowAIPanel(false)} generating={generating} />}
      {toast && <Toast message={toast.message} type={toast.type} />}
      <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}

export function FlowEditor() {
  return (
    <ReactFlowProvider>
      <FlowEditorInner />
    </ReactFlowProvider>
  );
  }
