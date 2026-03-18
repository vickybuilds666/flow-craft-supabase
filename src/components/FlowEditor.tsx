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
  BackgroundVariant,
} from 'reactflow';
import 'reactflow/dist/style.css';
import { useAuth } from '../contexts/AuthContext';
import { supabase, Flow } from '../lib/supabase';
import { Save, FolderOpen, LogOut, Plus, Trash2, CheckCircle, XCircle } from 'lucide-react';

const initialNodes: Node[] = [
  {
    id: '1',
    type: 'input',
    data: { label: 'Start' },
    position: { x: 250, y: 25 },
  },
];

// ── Toast Component ────────────────────────────────────────────────────────
function Toast({ message, type }: { message: string; type: 'success' | 'error' }) {
  return (
    <div
      style={{
        position: 'fixed',
        bottom: '24px',
        left: '50%',
        transform: 'translateX(-50%)',
        zIndex: 9999,
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
        padding: '12px 20px',
        borderRadius: '10px',
        background: type === 'success' ? '#166534' : '#991b1b',
        color: '#fff',
        fontSize: '14px',
        fontWeight: 600,
        boxShadow: '0 8px 24px rgba(0,0,0,0.3)',
        animation: 'fadeInUp 0.2s ease',
      }}
    >
      {type === 'success'
        ? <CheckCircle size={16} />
        : <XCircle size={16} />
      }
      {message}
      <style>{`
        @keyframes fadeInUp {
          from { opacity: 0; transform: translateX(-50%) translateY(10px); }
          to   { opacity: 1; transform: translateX(-50%) translateY(0); }
        }
      `}</style>
    </div>
  );
}

// ── Main Component ─────────────────────────────────────────────────────────
export function FlowEditor() {
  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);
  const [flowName, setFlowName] = useState('Untitled Flow');
  const [currentFlowId, setCurrentFlowId] = useState<string | null>(null);
  const [flows, setFlows] = useState<Flow[]>([]);
  const [showLoadMenu, setShowLoadMenu] = useState(false);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
  const { signOut, user } = useAuth();

  // ── Show toast helper ────────────────────────────────────────────────────
  const showToast = (message: string, type: 'success' | 'error') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 2500);
  };

  const onConnect = useCallback(
    (params: Connection | Edge) => setEdges((eds) => addEdge(params, eds)),
    [setEdges]
  );

  // ── Load all flows list ──────────────────────────────────────────────────
  const loadFlows = async () => {
    const { data, error } = await supabase
      .from('flows')
      .select('*')
      .order('updated_at', { ascending: false });

    if (!error && data) {
      setFlows(data);
    }
  };

  // ── Auto-load last edited flow on login ──────────────────────────────────
  useEffect(() => {
    const autoLoad = async () => {
      const { data, error } = await supabase
        .from('flows')
        .select('*')
        .order('updated_at', { ascending: false })
        .limit(1)
        .maybeSingle();

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

  // ── Ctrl+S keyboard shortcut ─────────────────────────────────────────────
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 's') {
        e.preventDefault();
        handleSave();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [nodes, edges, flowName, currentFlowId, user]);

  // ── Save / Update flow ───────────────────────────────────────────────────
  const handleSave = async () => {
    if (!user) return;

    setSaving(true);
    const flowData = { nodes, edges };

    if (currentFlowId) {
      const { error } = await supabase
        .from('flows')
        .update({
          name: flowName,
          data: flowData,
          updated_at: new Date().toISOString(),
        })
        .eq('id', currentFlowId);

      if (!error) {
        await loadFlows();
        showToast('Flow saved!', 'success');
      } else {
        showToast('Save failed. Try again.', 'error');
      }
    } else {
      const { data, error } = await supabase
        .from('flows')
        .insert({
          user_id: user.id,
          name: flowName,
          data: flowData,
        })
        .select()
        .maybeSingle();

      if (!error && data) {
        setCurrentFlowId(data.id);
        await loadFlows();
        showToast('Flow saved!', 'success');
      } else {
        showToast('Save failed. Try again.', 'error');
      }
    }

    setSaving(false);
  };

  // ── Load selected flow ───────────────────────────────────────────────────
  const handleLoad = (flow: Flow) => {
    setNodes(flow.data.nodes || []);
    setEdges(flow.data.edges || []);
    setFlowName(flow.name);
    setCurrentFlowId(flow.id);
    setShowLoadMenu(false);
  };

  // ── Delete flow ──────────────────────────────────────────────────────────
  const handleDelete = async (flowId: string) => {
    await supabase.from('flows').delete().eq('id', flowId);
    await loadFlows();
    if (currentFlowId === flowId) {
      setCurrentFlowId(null);
      setFlowName('Untitled Flow');
      setNodes(initialNodes);
      setEdges([]);
    }
  };

  // ── New flow ─────────────────────────────────────────────────────────────
  const handleNew = () => {
    setCurrentFlowId(null);
    setFlowName('Untitled Flow');
    setNodes(initialNodes);
    setEdges([]);
  };

  // ── Add node ─────────────────────────────────────────────────────────────
  const addNode = () => {
    const newNode: Node = {
      id: `${nodes.length + 1}`,
      data: { label: `Node ${nodes.length + 1}` },
      position: {
        x: Math.random() * 400 + 100,
        y: Math.random() * 400 + 100,
      },
    };
    setNodes((nds) => [...nds, newNode]);
  };

  // ── Render ───────────────────────────────────────────────────────────────
  return (
    <div className="h-screen flex flex-col">
      <header className="bg-slate-900 text-white px-6 py-4 shadow-lg">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <h1 className="text-2xl font-bold tracking-tight">FLOW.CRAFT</h1>
            <input
              type="text"
              value={flowName}
              onChange={(e) => setFlowName(e.target.value)}
              className="bg-slate-800 px-4 py-2 rounded-lg border border-slate-700 focus:border-slate-500 focus:outline-none"
              placeholder="Flow name"
            />
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleNew}
              className="flex items-center gap-2 px-4 py-2 bg-slate-800 hover:bg-slate-700 rounded-lg transition-colors"
            >
              <Plus className="w-4 h-4" />
              New
            </button>
            <button
              onClick={addNode}
              className="flex items-center gap-2 px-4 py-2 bg-slate-800 hover:bg-slate-700 rounded-lg transition-colors"
            >
              <Plus className="w-4 h-4" />
              Add Node
            </button>
            <button
              onClick={handleSave}
              disabled={saving}
              className="flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-700 rounded-lg transition-colors disabled:opacity-50"
              title="Save (Ctrl+S)"
            >
              <Save className="w-4 h-4" />
              {saving ? 'Saving...' : 'Save'}
            </button>
            <button
              onClick={() => { setShowLoadMenu(!showLoadMenu); if (!showLoadMenu) loadFlows(); }}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors"
            >
              <FolderOpen className="w-4 h-4" />
              Load
            </button>
            <button
              onClick={signOut}
              className="flex items-center gap-2 px-4 py-2 bg-red-600 hover:bg-red-700 rounded-lg transition-colors"
            >
              <LogOut className="w-4 h-4" />
              Sign Out
            </button>
          </div>
        </div>
      </header>

      <div className="flex-1 relative">
        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onConnect={onConnect}
          fitView
        >
          <Controls />
          <MiniMap />
          <Background variant={BackgroundVariant.Dots} gap={12} size={1} />
        </ReactFlow>

        {/* ── Load Menu ── */}
        {showLoadMenu && (
          <div className="absolute top-4 right-4 bg-white rounded-lg shadow-2xl p-4 w-80 max-h-96 overflow-y-auto z-50">
            <h3 className="text-lg font-semibold mb-3 text-slate-900">Your Flows</h3>
            {flows.length === 0 ? (
              <p className="text-slate-500 text-sm">No saved flows yet</p>
            ) : (
              <div className="space-y-2">
                {flows.map((flow) => (
                  <div
                    key={flow.id}
                    className={`flex items-center justify-between p-3 border rounded-lg transition-colors ${
                      currentFlowId === flow.id
                        ? 'border-blue-400 bg-blue-50'
                        : 'border-slate-200 hover:border-slate-300'
                    }`}
                  >
                    <button
                      onClick={() => handleLoad(flow)}
                      className="flex-1 text-left"
                    >
                      <div className="font-medium text-slate-900">
                        {currentFlowId === flow.id && (
                          <span className="text-blue-500 mr-1">●</span>
                        )}
                        {flow.name}
                      </div>
                      <div className="text-xs text-slate-500">
                        {new Date(flow.updated_at).toLocaleDateString('en-IN', {
                          day: 'numeric', month: 'short', year: 'numeric',
                          hour: '2-digit', minute: '2-digit',
                        })}
                      </div>
                    </button>
                    <button
                      onClick={() => handleDelete(flow.id)}
                      className="ml-2 p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* ── Toast ── */}
      {toast && <Toast message={toast.message} type={toast.type} />}
    </div>
  );
    }
