import { useAuth } from './contexts/AuthContext';
import { AuthForm } from './components/AuthForm';
import { FlowEditor } from './components/FlowEditor';

export default function App() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center">
        <div className="text-white text-2xl">Loading...</div>
      </div>
    );
  }

  return user ? <FlowEditor /> : <AuthForm />;
}
