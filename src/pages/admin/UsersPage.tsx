import React, { useState, useEffect } from 'react';
import { Users, Plus, Edit, Trash2, Shield, UserCheck, X, KeyRound, Mail, User } from 'lucide-react';
import { collection, onSnapshot, doc, updateDoc, setDoc, query, orderBy } from 'firebase/firestore';
import { createUserWithEmailAndPassword, signOut } from 'firebase/auth';
import { db, secondaryAuth, handleFirestoreError, OperationType } from '../../firebase';
import { ErpUser } from '../../types';
import { toast } from 'sonner';

export default function UsersPage() {
  const [users, setUsers] = useState<ErpUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<ErpUser | null>(null);

  // Form states
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<'master' | 'collaborator'>('collaborator');
  const [deleteConfirm, setDeleteConfirm] = useState<{ id: string; userEmail: string } | null>(null);

  useEffect(() => {
    const q = query(collection(db, 'users'), orderBy('createdAt', 'desc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const userList: ErpUser[] = [];
      snapshot.forEach((doc) => {
        const data = doc.data() as ErpUser;
        if (!data.deleted) {
          userList.push({ id: doc.id, ...data });
        }
      });
      setUsers(userList);
      setLoading(false);
    }, (error) => {
      console.warn('Error fetching users collection:', error);
      setLoading(false);
    });

    return unsubscribe;
  }, []);

  const openCreateModal = () => {
    setEditingUser(null);
    setName('');
    setEmail('');
    setPassword('');
    setRole('collaborator');
    setIsModalOpen(true);
  };

  const openEditModal = (user: ErpUser) => {
    setEditingUser(user);
    setName(user.name);
    setEmail(user.email);
    setPassword('');
    setRole(user.role);
    setIsModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !email.trim() || (!editingUser && !password.trim())) {
      toast.error('Por favor, preencha todos os campos obrigatórios.');
      return;
    }

    try {
      if (editingUser) {
        await updateDoc(doc(db, 'users', editingUser.id), {
          name: name.trim(),
          role
        });
        toast.success('Perfil e nível de acesso atualizados.');
      } else {
        // Check if email already exists
        const emailExists = users.some(u => u.email.toLowerCase() === email.toLowerCase());
        if (emailExists) {
          toast.error('Este e-mail já está cadastrado.');
          return;
        }

        const credential = await createUserWithEmailAndPassword(secondaryAuth, email.trim(), password);
        try {
          await setDoc(doc(db, 'users', credential.user.uid), {
            name: name.trim(),
            email: email.trim().toLowerCase(),
            role,
            createdAt: new Date().toISOString()
          });
        } finally {
          await signOut(secondaryAuth);
        }
        toast.success('Nova conta criada com Firebase Authentication.');
      }
      setIsModalOpen(false);
    } catch (err) {
      console.error('Error saving user:', err);
      toast.error('Erro ao salvar usuário no banco de dados.');
      handleFirestoreError(err, editingUser ? OperationType.UPDATE : OperationType.CREATE, editingUser ? `users/${editingUser.id}` : 'users');
    }
  };

  const handleDelete = (id: string, userEmail: string) => {
    setDeleteConfirm({ id, userEmail });
  };

  const handleExecuteDelete = async (id: string, userEmail: string) => {
    try {
      await updateDoc(doc(db, 'users', id), {
        deleted: true,
        deletedAt: new Date().toISOString()
      });
      toast.success('Acesso ao ERP removido. A conta de autenticação não foi apagada.');
    } catch (err) {
      console.error('Error disabling user:', err);
      toast.error('Erro ao remover o acesso do usuário.');
      handleFirestoreError(err, OperationType.DELETE, `users/${id}`);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="space-y-1">
          <h1 className="text-xl font-bold text-white flex items-center space-x-2">
            <Users className="w-5 h-5 text-emerald-500" />
            <span>Contas de Usuário (Exclusivo Master)</span>
          </h1>
          <p className="text-xs text-neutral-400">
            Cadastre perfis de acesso para advogados e colaboradores.
          </p>
        </div>

        <button
          onClick={openCreateModal}
          className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold px-4 py-2.5 rounded-xl flex items-center space-x-2 transition-all cursor-pointer shadow-lg shadow-emerald-950/20"
        >
          <Plus className="w-4 h-4" />
          <span>Cadastrar Nova Conta</span>
        </button>
      </div>

      <div className="bg-emerald-950/10 border border-emerald-900/30 p-4 rounded-xl text-xs text-emerald-400 leading-relaxed max-w-4xl">
        <strong>Segurança:</strong> as senhas são criadas e verificadas pelo Firebase Authentication; elas não são salvas neste banco. Apenas contas Master podem gerenciar perfis e permissões.
      </div>

      <div className="bg-neutral-900 border border-neutral-800 rounded-2xl overflow-hidden shadow-sm">
        {loading ? (
          <div className="p-10 text-center text-xs text-neutral-500 font-mono">
            Carregando credenciais registradas...
          </div>
        ) : users.length === 0 ? (
          <div className="p-10 text-center text-xs text-neutral-500 font-mono">
            Nenhuma conta secundária cadastrada. Use o botão acima para adicionar colaboradores.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-neutral-300">
              <thead className="bg-neutral-950/60 border-b border-neutral-850 text-neutral-400 font-mono uppercase text-[10px] tracking-wider">
                <tr>
                  <th className="px-5 py-4">Nome / Profissional</th>
                  <th className="px-5 py-4">E-mail de Login</th>
                  <th className="px-5 py-4">Nível de Acesso</th>
                  <th className="px-5 py-4 text-right">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-850/50">
                {users.map((u) => (
                  <tr key={u.id} className="hover:bg-neutral-950/20 transition-colors">
                    <td className="px-5 py-4 font-semibold text-neutral-200">
                      <div className="flex items-center space-x-2">
                        <div className={`w-2.5 h-2.5 rounded-full ${u.role === 'master' ? 'bg-emerald-500' : 'bg-blue-500'}`} />
                        <span>{u.name}</span>
                      </div>
                    </td>
                    <td className="px-5 py-4 font-mono text-neutral-400">{u.email}</td>
                    <td className="px-5 py-4">
                      <span className={`inline-flex items-center space-x-1 px-2 py-0.5 rounded font-mono text-[9px] font-bold uppercase tracking-wider ${
                        u.role === 'master'
                          ? 'bg-emerald-950/50 text-emerald-400 border border-emerald-900/30'
                          : 'bg-blue-950/50 text-blue-400 border border-blue-900/30'
                      }`}>
                        <Shield className="w-3 h-3" />
                        <span>{u.role}</span>
                      </span>
                    </td>
                    <td className="px-5 py-4 text-right">
                      <div className="flex items-center justify-end space-x-2">
                        <button
                          onClick={() => openEditModal(u)}
                          className="p-1.5 hover:bg-neutral-800 text-neutral-400 hover:text-white rounded transition-colors cursor-pointer"
                          title="Editar credenciais"
                        >
                          <Edit className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => handleDelete(u.id, u.email)}
                          className="p-1.5 hover:bg-neutral-800 text-neutral-400 hover:text-red-400 rounded transition-colors cursor-pointer"
                          title="Excluir conta"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
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

      {/* Modal - Cadastrar/Editar Usuário */}
      
      {deleteConfirm && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-neutral-900 border border-neutral-800 p-6 rounded-2xl max-w-sm w-full space-y-4 text-left shadow-2xl">
            <h3 className="text-md font-bold text-neutral-100 font-display">Excluir Conta de Usuário</h3>
            <p className="text-xs text-neutral-400 leading-relaxed">
              Deseja realmente excluir a conta de <strong>{deleteConfirm.userEmail}</strong>? Esta ação removerá o acesso ao sistema.
            </p>
            <div className="flex justify-end space-x-3 pt-2">
              <button
                type="button"
                onClick={() => setDeleteConfirm(null)}
                className="px-4 py-2 border border-neutral-800 text-neutral-400 hover:bg-neutral-850 rounded-lg text-xs font-semibold cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={() => {
                  handleExecuteDelete(deleteConfirm.id, deleteConfirm.userEmail);
                  setDeleteConfirm(null);
                }}
                className="px-4 py-2 bg-red-650 hover:bg-red-700 text-white rounded-lg text-xs font-semibold cursor-pointer transition-colors"
              >
                Confirmar Exclusão
              </button>
            </div>
          </div>
        </div>
      )}

      {isModalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-neutral-900 border border-neutral-800 w-full max-w-md rounded-2xl overflow-hidden shadow-xl">
            <div className="border-b border-neutral-850 px-5 py-4 flex items-center justify-between">
              <h3 className="font-bold text-white text-sm uppercase font-mono tracking-wider flex items-center space-x-2">
                <Shield className="w-4 h-4 text-emerald-500" />
                <span>{editingUser ? 'Alterar Perfil de Acesso' : 'Cadastrar Conta'}</span>
              </h3>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-neutral-500 hover:text-neutral-300 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSave} className="p-5 space-y-4 text-xs">
              <div className="space-y-1">
                <label className="block text-xs uppercase font-mono font-bold tracking-wider text-neutral-400 flex items-center space-x-1">
                  <User className="w-3.5 h-3.5 text-neutral-500" />
                  <span>Nome do Profissional</span>
                </label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Ex: Dr. João Silva"
                  className="w-full px-3 py-2 bg-neutral-950 border border-neutral-800 rounded-xl focus:outline-none focus:ring-1 focus:ring-emerald-500 text-neutral-200"
                />
              </div>

              <div className="space-y-1">
                <label className="block text-xs uppercase font-mono font-bold tracking-wider text-neutral-400 flex items-center space-x-1">
                  <Mail className="w-3.5 h-3.5 text-neutral-500" />
                  <span>E-mail de Login</span>
                </label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  disabled={Boolean(editingUser)}
                  placeholder="Ex: joao@advogadoalmeida.com.br"
                  className="w-full px-3 py-2 bg-neutral-950 border border-neutral-800 disabled:opacity-60 rounded-xl focus:outline-none focus:ring-1 focus:ring-emerald-500 text-neutral-200"
                />
              </div>

              {!editingUser && <div className="space-y-1">
                <label className="block text-xs uppercase font-mono font-bold tracking-wider text-neutral-400 flex items-center space-x-1">
                  <KeyRound className="w-3.5 h-3.5 text-neutral-500" />
                  <span>Senha inicial</span>
                </label>
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Defina uma senha temporária"
                  className="w-full px-3 py-2 bg-neutral-950 border border-neutral-800 rounded-xl focus:outline-none focus:ring-1 focus:ring-emerald-500 text-neutral-200"
                />
                <p className="text-[10px] text-neutral-500">
                  A senha é enviada diretamente ao Firebase Authentication. O usuário poderá redefini-la pela opção “Esqueceu a senha”.
                </p>
              </div>}

              <div className="space-y-1">
                <label className="block text-xs uppercase font-mono font-bold tracking-wider text-neutral-400 flex items-center space-x-1">
                  <Shield className="w-3.5 h-3.5 text-neutral-500" />
                  <span>Papel / Nível de Acesso</span>
                </label>
                <select
                  value={role}
                  onChange={(e) => setRole(e.target.value as 'master' | 'collaborator')}
                  className="w-full px-3 py-2 bg-neutral-950 border border-neutral-800 rounded-xl focus:outline-none focus:ring-1 focus:ring-emerald-500 text-neutral-200"
                >
                  <option value="collaborator">Collaborator (Acesso padrão aos módulos)</option>
                  <option value="master">Master (Permissão de controle de contas + total)</option>
                </select>
              </div>

              <div className="flex justify-end space-x-2 pt-4">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 bg-neutral-950 hover:bg-neutral-850 text-neutral-300 border border-neutral-800 rounded-xl transition-all cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-semibold transition-all cursor-pointer"
                >
                  Salvar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
