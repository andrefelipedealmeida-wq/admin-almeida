import React, { useState } from 'react';
import { 
  Users2, 
  Search, 
  Plus, 
  UserPlus, 
  X, 
  Phone, 
  Mail, 
  MapPin, 
  FileText, 
  Edit3, 
  Trash2,
  Bookmark,
  Key
} from 'lucide-react';
import { Client, Case } from '../../types';
import { collection, setDoc, doc, updateDoc, deleteDoc } from 'firebase/firestore';
import { db, auth, secondaryAuth } from '../../firebase';
import { createUserWithEmailAndPassword, signOut } from 'firebase/auth';
import { toast } from 'sonner';

interface ClientsPageProps {
  clients: Client[];
  cases: Case[];
}

export default function ClientsPage({ clients, cases }: ClientsPageProps) {
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<{ id: string; title: string; message: string } | null>(null);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'todos' | 'ativo' | 'inativo'>('ativo');
  const [isAdding, setIsAdding] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [isCreatingAccount, setIsCreatingAccount] = useState(false);
  const [accountPassword, setAccountPassword] = useState('');

  const [formState, setFormState] = useState<{
    id: string;
    name: string;
    cpf: string;
    email: string;
    phone: string;
    address: string;
    notes: string;
    status: 'ativo' | 'inativo';
  }>({
    id: '',
    name: '',
    cpf: '',
    email: '',
    phone: '',
    address: '',
    notes: '',
    status: 'ativo'
  });

  const handleOpenAdd = () => {
    setFormState({
      id: '',
      name: '',
      cpf: '',
      email: '',
      phone: '',
      address: '',
      notes: '',
      status: 'ativo'
    });
    setIsEditing(false);
    setIsAdding(true);
  };

  const handleOpenEdit = (cli: Client) => {
    setFormState({
      id: cli.id,
      name: cli.name,
      cpf: cli.cpf,
      email: cli.email,
      phone: cli.phone,
      address: cli.address,
      notes: cli.notes,
      status: cli.status || 'ativo'
    });
    setIsEditing(true);
    setIsAdding(true);
  };

  const handleSaveClient = async (e: React.FormEvent) => {
    e.preventDefault();
    const finalName = formState.name.trim() || 'Cliente sem Nome';

    try {
      if (isEditing) {
        // Update
        const clientRef = doc(db, 'clients', formState.id);
        await updateDoc(clientRef, {
          name: finalName,
          cpf: formState.cpf.trim(),
          email: formState.email.trim(),
          phone: formState.phone.trim(),
          address: formState.address.trim(),
          notes: formState.notes,
          status: formState.status
        });
        
        // Also update local selectedClient state if it matches the edited client
        if (selectedClient && selectedClient.id === formState.id) {
          setSelectedClient({
            ...selectedClient,
            name: finalName,
            cpf: formState.cpf.trim(),
            email: formState.email.trim(),
            phone: formState.phone.trim(),
            address: formState.address.trim(),
            notes: formState.notes,
            status: formState.status
          });
        }
        
        toast.success('Ficha cadastral do cliente atualizada!');
      } else {
        // Create new ID
        const generatedId = 'cli_' + Math.random().toString(36).substr(2, 9);
        await setDoc(doc(db, 'clients', generatedId), {
          id: generatedId,
          name: finalName,
          cpf: formState.cpf.trim(),
          email: formState.email.trim(),
          phone: formState.phone.trim(),
          address: formState.address.trim(),
          notes: formState.notes,
          status: formState.status,
          userId: auth.currentUser?.uid || '',
          createdBy: auth.currentUser?.email || '',
          createdAt: new Date().toISOString()
        });
        toast.success('Cliente cadastrado com sucesso!');
      }

      setIsAdding(false);
    } catch (err) {
      console.error(err);
      toast.error('Erro ao salvar cliente.');
    }
  };

  const handleDeleteClient = (cliId: string) => {
    setDeleteConfirm({
      id: cliId,
      title: 'Ocultar Ficha de Cliente',
      message: 'Atenção: O cadastro do cliente será ocultado da lista, preservando o histórico de processos e registros no banco de dados. Continuar?'
    });
  };

  const handleCreateAccount = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedClient) return;
    if (!selectedClient.email) {
      toast.error('O cliente precisa ter um e-mail cadastrado.');
      return;
    }
    if (accountPassword.length < 6) {
      toast.error('A senha deve ter no mínimo 6 caracteres.');
      return;
    }

    try {
      // Create user using secondary auth instance to avoid logging out admin
      const userCred = await createUserWithEmailAndPassword(secondaryAuth, selectedClient.email, accountPassword);
      // Log out the secondary auth right away just to keep it clean
      await signOut(secondaryAuth);
      
      const newUid = userCred.user.uid;
      
      // Update client document
      await updateDoc(doc(db, 'clients', selectedClient.id), {
        uid: newUid,
        role: 'client'
      });
      
      setSelectedClient({ ...selectedClient, uid: newUid, role: 'client' });
      toast.success('Conta de acesso criada com sucesso!');
      setIsCreatingAccount(false);
      setAccountPassword('');
    } catch (err: any) {
      console.error(err);
      toast.error('Erro ao criar conta: ' + (err.message || 'Erro desconhecido.'));
    }
  };

  const filteredClients = clients.filter(c => {
    if (c.deleted) return false;
    const matchesSearch = 
      c.name.toLowerCase().includes(search.toLowerCase()) || 
      c.cpf.includes(search) || 
      c.email.toLowerCase().includes(search.toLowerCase());
    const clientStatus = c.status || 'ativo';
    const matchesStatus = statusFilter === 'todos' || clientStatus === statusFilter;
    return matchesSearch && matchesStatus;
  });

  return (
    <div className="space-y-6 text-neutral-100">
      
      <div className="flex justify-between items-center bg-neutral-900 border border-neutral-800 p-4 rounded-xl">
        <h2 className="text-sm font-semibold font-display text-neutral-200">Cadastro Integrado de Clientes</h2>
        <button
          onClick={handleOpenAdd}
          className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-semibold flex items-center space-x-1.5 transition-colors"
        >
          <UserPlus className="w-4 h-4" />
          <span>Cadastrar Cliente</span>
        </button>
      </div>

      {/* Search Input and Status Filter Bar */}
      <div className="flex flex-col sm:flex-row gap-4 bg-neutral-900 border border-neutral-800 p-4 rounded-xl items-stretch sm:items-center justify-between">
        <div className="relative flex-1">
          <Search className="w-4 h-4 absolute left-3.5 top-3 text-neutral-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar por nome, CPF ou e-mail de contato..."
            className="w-full pl-10 pr-4 py-2 bg-neutral-950 border border-neutral-800 text-xs rounded-lg focus:outline-none focus:ring-1 focus:ring-emerald-500"
          />
        </div>

        {/* Status Filter Buttons */}
        <div className="flex items-center space-x-1.5 bg-neutral-950 p-1 border border-neutral-800 rounded-lg self-start sm:self-auto">
          <button
            type="button"
            onClick={() => setStatusFilter('todos')}
            className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-colors cursor-pointer ${
              statusFilter === 'todos' 
                ? 'bg-neutral-800 text-white shadow-sm' 
                : 'text-neutral-400 hover:text-neutral-200'
            }`}
          >
            Todos ({clients.filter(c => !c.deleted).length})
          </button>
          <button
            type="button"
            onClick={() => setStatusFilter('ativo')}
            className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-colors cursor-pointer flex items-center space-x-1.5 ${
              statusFilter === 'ativo' 
                ? 'bg-emerald-950/80 text-emerald-300 border border-emerald-800/60 shadow-sm' 
                : 'text-neutral-400 hover:text-emerald-400'
            }`}
          >
            <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block"></span>
            <span>Apenas Ativos ({clients.filter(c => !c.deleted && (c.status || 'ativo') === 'ativo').length})</span>
          </button>
          <button
            type="button"
            onClick={() => setStatusFilter('inativo')}
            className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-colors cursor-pointer flex items-center space-x-1.5 ${
              statusFilter === 'inativo' 
                ? 'bg-neutral-800 text-neutral-200 border border-neutral-700 shadow-sm' 
                : 'text-neutral-400 hover:text-neutral-200'
            }`}
          >
            <span className="w-2 h-2 rounded-full bg-neutral-500 inline-block"></span>
            <span>Apenas Inativos ({clients.filter(c => !c.deleted && c.status === 'inativo').length})</span>
          </button>
        </div>
      </div>

      {/* Main split grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        
        {/* Clients list table */}
        <div className="lg:col-span-12">
          <div className="bg-neutral-900 rounded-xl border border-neutral-800 overflow-x-auto">
            <table className="w-full text-left border-collapse min-w-[750px]">
              <thead className="bg-neutral-950 border-b border-neutral-800 text-xs text-neutral-400 font-mono tracking-wider">
                <tr>
                  <th className="px-6 py-3.5">Nome do Cliente</th>
                  <th className="px-6 py-3.5">Status</th>
                  <th className="px-6 py-3.5">Documentação</th>
                  <th className="px-6 py-3.5">E-mail</th>
                  <th className="px-6 py-3.5">Contato Telefônico</th>
                  <th className="px-6 py-3.5 text-right">Ação</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-800/60 text-xs">
                {filteredClients.length > 0 ? (
                  filteredClients.map((cli) => {
                    const isAtivo = (cli.status || 'ativo') === 'ativo';
                    return (
                      <tr 
                        key={cli.id} 
                        className={`hover:bg-neutral-850/50 cursor-pointer transition-colors ${selectedClient?.id === cli.id ? 'bg-neutral-850' : ''}`}
                        onClick={() => setSelectedClient(cli)}
                      >
                        <td className="px-6 py-4 font-semibold text-neutral-200">
                          {cli.name}
                        </td>
                        <td className="px-6 py-4">
                          <span className={`px-2.5 py-1 text-[10px] font-bold uppercase rounded-full tracking-wider border ${
                            isAtivo
                              ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                              : 'bg-neutral-800 text-neutral-400 border-neutral-700'
                          }`}>
                            {isAtivo ? 'Ativo' : 'Inativo'}
                          </span>
                        </td>
                        <td className="px-6 py-4 font-mono text-neutral-400">
                          CPF: {cli.cpf}
                        </td>
                        <td className="px-6 py-4 text-emerald-400">
                          {cli.email}
                        </td>
                        <td className="px-6 py-4 text-neutral-300">
                          {cli.phone}
                        </td>
                        <td className="px-6 py-4 text-right space-x-2">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleOpenEdit(cli);
                            }}
                            className="p-1 px-2.5 bg-neutral-850 hover:bg-neutral-750 text-neutral-200 rounded text-[11px] font-semibold transition-colors cursor-pointer"
                          >
                            <Edit3 className="w-3.5 h-3.5 inline mr-1" />
                            <span>Editar</span>
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDeleteClient(cli.id);
                            }}
                            className="p-1 px-2.5 bg-red-950/20 hover:bg-red-900/40 text-red-400 rounded text-[11px] font-semibold transition-colors cursor-pointer"
                          >
                            <Trash2 className="w-3.5 h-3.5 inline mr-1" />
                            <span>Excluir</span>
                          </button>
                        </td>
                      </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td colSpan={6} className="text-center py-12 text-slate-500">Nenhum cliente localizado.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

      </div>

      {/* Individual Details Drawer Overlays */}
      {selectedClient && (
        <div className="fixed inset-y-0 right-0 w-full sm:max-w-md bg-neutral-900 border-l border-neutral-800 shadow-2xl z-50 overflow-y-auto p-6 sm:p-8 space-y-6 flex flex-col justify-between">
          
          <div className="space-y-6">
            <div className="flex justify-between items-start border-b border-neutral-800 pb-4">
              <div className="space-y-1">
                <div className="flex items-center space-x-2">
                  <span className="text-[10px] uppercase font-mono font-bold tracking-widest text-emerald-500">Histórico do Cliente</span>
                  <span className={`px-2 py-0.5 text-[9px] font-bold uppercase rounded border ${
                    (selectedClient.status || 'ativo') === 'ativo'
                      ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                      : 'bg-neutral-800 text-neutral-400 border-neutral-700'
                  }`}>
                    {(selectedClient.status || 'ativo') === 'ativo' ? 'Ativo' : 'Inativo'}
                  </span>
                </div>
                <h3 className="text-lg font-bold text-neutral-100 font-display leading-snug">{selectedClient.name}</h3>
                <p className="text-xs text-neutral-400 font-mono">CPF: {selectedClient.cpf}</p>
              </div>
              <button 
                onClick={() => setSelectedClient(null)}
                className="p-1.5 hover:bg-neutral-800 text-neutral-400 hover:text-white rounded-lg transition-colors focus:outline-none"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* General Contact Info */}
            <div className="space-y-4 bg-neutral-950 p-4 rounded-xl border border-neutral-850 text-xs">
              <div className="flex items-center space-x-2">
                <Mail className="w-4 h-4 text-emerald-500 flex-shrink-0" />
                <span className="text-neutral-300">{selectedClient.email}</span>
              </div>
              <div className="flex items-center space-x-2">
                <Phone className="w-4 h-4 text-emerald-500 flex-shrink-0" />
                <span className="text-neutral-300">{selectedClient.phone}</span>
              </div>
              <div className="flex items-center space-x-2">
                <MapPin className="w-4 h-4 text-emerald-500 flex-shrink-0" />
                <span className="text-neutral-300 leading-normal">{selectedClient.address || "Endereço não cadastrado."}</span>
              </div>
            </div>

            {/* Cases linked of client */}
            <div className="space-y-3">
              <h4 className="text-xs font-bold font-mono uppercase tracking-wider text-neutral-400 border-b border-neutral-850 pb-2">Processos Vinculados</h4>
              
              <div className="space-y-2">
                {cases.filter(cs => cs.clientId === selectedClient.id || cs.clientName === selectedClient.name).length > 0 ? (
                  cases
                    .filter(cs => cs.clientId === selectedClient.id || cs.clientName === selectedClient.name)
                    .map(cs => (
                      <div key={cs.id} className="p-3 bg-neutral-950 rounded-xl border border-neutral-850 text-xs flex justify-between items-center">
                        <div className="space-y-0.5">
                          <strong className="text-neutral-200 block">{cs.title}</strong>
                          <span className="text-[10px] text-neutral-500 font-mono block">{cs.caseNumber}</span>
                        </div>
                        <span className={`px-2 py-0.5 text-[9px] font-bold font-mono tracking-wider uppercase rounded ${
                          cs.status === 'Em andamento' ? 'bg-emerald-500/10 text-emerald-400' : 'bg-neutral-800 text-neutral-400'
                        }`}>
                          {cs.status}
                        </span>
                      </div>
                    ))
                ) : (
                  <div className="text-[11px] text-neutral-500 py-2 italic text-left">Este cliente não possui processos litigiosos cadastrados.</div>
                )}
              </div>
            </div>

            {/* Personal records, background text notes */}
            <div className="space-y-2">
              <label className="block text-xs uppercase font-mono font-bold tracking-widest text-neutral-400">Sumário da Entrevista / Pendências:</label>
              <textarea
                rows={4}
                value={selectedClient.notes}
                onChange={async (e) => {
                  setSelectedClient({ ...selectedClient, notes: e.target.value });
                  await updateDoc(doc(db, 'clients', selectedClient.id), { notes: e.target.value });
                }}
                className="w-full text-xs p-3 bg-neutral-950 border border-neutral-850 rounded-lg text-neutral-200 focus:outline-none focus:ring-1 focus:ring-emerald-500 leading-relaxed font-sans"
                placeholder="Insira detalhes de rescisões coletadas da carteira física, anotações de parentescos ou acordos..."
              />
              <span className="text-[10px] text-neutral-500">Alterações salvas de forma automática no banco.</span>
            </div>

          </div>

          <div className="border-t border-neutral-800 pt-4 flex flex-col sm:flex-row justify-between items-center space-y-3 sm:space-y-0">
            <button
              onClick={() => handleDeleteClient(selectedClient.id)}
              className="px-3 py-1.5 hover:bg-red-950/20 text-red-400 hover:text-red-300 border border-red-900/40 rounded text-xs font-semibold flex items-center space-x-1 cursor-pointer w-full sm:w-auto justify-center"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Ocultar Ficha</span>
            </button>
            
            <div className="flex space-x-2 w-full sm:w-auto justify-center">
              {!selectedClient.uid ? (
                <button
                  onClick={() => setIsCreatingAccount(true)}
                  className="px-4 py-1.5 bg-neutral-800 hover:bg-neutral-700 text-neutral-200 rounded text-xs font-semibold flex items-center space-x-1.5 transition-colors cursor-pointer"
                >
                  <Key className="w-3.5 h-3.5" />
                  <span>Criar Acesso</span>
                </button>
              ) : (
                <div className="px-3 py-1.5 bg-emerald-900/20 border border-emerald-900/50 text-emerald-400 rounded text-[11px] font-bold flex items-center space-x-1.5">
                  <Key className="w-3 h-3" />
                  <span>Acesso Ativo</span>
                </div>
              )}
              
              <button
                onClick={() => handleOpenEdit(selectedClient)}
                className="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded text-xs font-semibold flex items-center space-x-1.5 transition-colors cursor-pointer"
              >
                <Edit3 className="w-3.5 h-3.5" />
                <span>Editar</span>
              </button>
            </div>
          </div>

        </div>
      )}

      {/* Create Account Overlay */}
      {isCreatingAccount && selectedClient && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-neutral-900 border border-neutral-800 p-6 sm:p-8 rounded-2xl max-w-sm w-full space-y-6">
            <div className="flex justify-between items-center border-b border-neutral-800 pb-3">
              <h3 className="text-md font-bold text-neutral-100 font-display">
                Criar Acesso ao Portal
              </h3>
              <button 
                onClick={() => { setIsCreatingAccount(false); setAccountPassword(''); }}
                className="p-1 hover:bg-neutral-850 rounded font-semibold text-neutral-400"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            
            <form onSubmit={handleCreateAccount} className="space-y-4">
              <p className="text-[11px] text-neutral-400 leading-relaxed">
                Isto criará uma conta para <strong className="text-emerald-400">{selectedClient.email}</strong> acessar o Portal do Cliente. Defina uma senha inicial (mínimo 6 caracteres).
              </p>
              
              <div>
                <label className="block text-xs uppercase font-mono font-bold tracking-wider mb-1.5 text-neutral-400">Senha Inicial</label>
                <input
                  type="text"
                  value={accountPassword}
                  onChange={(e) => setAccountPassword(e.target.value)}
                  placeholder="Ex: 123456"
                  required
                  minLength={6}
                  className="w-full px-3 py-2 border border-neutral-850 bg-neutral-950 rounded-lg text-neutral-200 focus:outline-none"
                />
              </div>

              <div className="flex justify-end space-x-3 pt-3">
                <button
                  type="button"
                  onClick={() => { setIsCreatingAccount(false); setAccountPassword(''); }}
                  className="px-4 py-2 border border-neutral-800 text-neutral-400 hover:bg-neutral-850 rounded-lg text-xs font-semibold"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-semibold transition-transform"
                >
                  Criar Conta
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Create Client overlay */}
      {isAdding && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-neutral-900 border border-neutral-800 p-6 sm:p-8 rounded-2xl max-w-lg w-full space-y-6 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center border-b border-neutral-800 pb-3">
              <h3 className="text-md font-bold text-neutral-100 font-display">
                {isEditing ? 'Atualizar Ficha de Cliente' : 'Cadastrar Novo Cliente'}
              </h3>
              <button 
                onClick={() => setIsAdding(false)}
                className="p-1 hover:bg-neutral-850 rounded font-semibold text-neutral-400"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveClient} className="space-y-4 text-xs font-semibold">
              
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="sm:col-span-2">
                  <label className="block text-xs uppercase font-mono font-bold tracking-wider mb-1.5 text-neutral-400">Nome Oficial do Cliente</label>
                  <input
                    type="text"
                    value={formState.name}
                    onChange={(e) => setFormState({ ...formState, name: e.target.value })}
                    placeholder="Ex: Júlio Cesar Santos"
                    className="w-full px-3 py-2 border border-neutral-850 bg-neutral-950 rounded-lg text-neutral-200 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs uppercase font-mono font-bold tracking-wider mb-1.5 text-neutral-400">Status</label>
                  <select
                    value={formState.status}
                    onChange={(e) => setFormState({ ...formState, status: e.target.value as 'ativo' | 'inativo' })}
                    className="w-full px-3 py-2 border border-neutral-850 bg-neutral-950 rounded-lg text-neutral-200 focus:outline-none cursor-pointer"
                  >
                    <option value="ativo">Ativo</option>
                    <option value="inativo">Inativo</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs uppercase font-mono font-bold tracking-wider mb-1.5 text-neutral-400">Documento CPF</label>
                  <input
                    type="text"
                    value={formState.cpf}
                    onChange={(e) => setFormState({ ...formState, cpf: e.target.value })}
                    placeholder="Ex: 123.456.789-00"
                    className="w-full px-3 py-2 border border-neutral-850 bg-neutral-950 rounded-lg text-neutral-200 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs uppercase font-mono font-bold tracking-wider mb-1.5 text-neutral-400">Canal de Contato Telefônico</label>
                  <input
                    type="text"
                    value={formState.phone}
                    onChange={(e) => setFormState({ ...formState, phone: e.target.value })}
                    placeholder="Ex: (11) 98765-4321"
                    className="w-full px-3 py-2 border border-neutral-850 bg-neutral-950 rounded-lg text-neutral-200 focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs uppercase font-mono font-bold tracking-wider mb-1.5 text-neutral-400">E-mail de Contato Principal</label>
                <input
                  type="email"
                  value={formState.email}
                  onChange={(e) => setFormState({ ...formState, email: e.target.value })}
                  placeholder="Ex: julio.cesar@gmail.com"
                  className="w-full px-3 py-2 border border-neutral-850 bg-neutral-950 rounded-lg text-neutral-200 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs uppercase font-mono font-bold tracking-wider mb-1.5 text-neutral-400">Endereço Residencial Completo</label>
                <input
                  type="text"
                  value={formState.address}
                  onChange={(e) => setFormState({ ...formState, address: e.target.value })}
                  placeholder="Ex: Rua das Rosas, 100, São Paulo - SP"
                  className="w-full px-3 py-2 border border-neutral-850 bg-neutral-950 rounded-lg text-neutral-200 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs uppercase font-mono font-bold tracking-wider mb-1.5 text-neutral-400">Observações / Triagem Inicial</label>
                <textarea
                  rows={3}
                  value={formState.notes}
                  onChange={(e) => setFormState({ ...formState, notes: e.target.value })}
                  placeholder="Notas resumindo as reivindicações de aviso prévio, holding, relação de parentesco de herança..."
                  className="w-full px-3 py-2 border border-neutral-850 bg-neutral-950 rounded-lg text-neutral-200 focus:outline-none"
                />
              </div>

              <div className="flex justify-end space-x-3 pt-3">
                <button
                  type="button"
                  onClick={() => setIsAdding(false)}
                  className="px-4 py-2 border border-neutral-800 text-neutral-400 hover:bg-neutral-850 rounded-lg text-xs font-semibold"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-semibold transition-transform"
                >
                  Confirmar Cadastro
                </button>
              </div>

            </form>
          </div>
        </div>
      )}

      {deleteConfirm && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-neutral-900 border border-neutral-800 p-6 rounded-2xl max-w-sm w-full space-y-4 text-left">
            <h3 className="text-md font-bold text-neutral-100 font-display">{deleteConfirm.title}</h3>
            <p className="text-xs text-neutral-400 leading-relaxed">{deleteConfirm.message}</p>
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
                onClick={async () => {
                  try {
                    await updateDoc(doc(db, 'clients', deleteConfirm.id), {
                      deleted: true,
                      deletedAt: new Date().toISOString()
                    });
                    setSelectedClient(null);
                    toast.success('Cadastro do cliente ocultado com sucesso (Soft Delete).');
                  } catch (err) {
                    console.error(err);
                    toast.error('Erro ao ocultar cadastro de cliente.');
                  } finally {
                    setDeleteConfirm(null);
                  }
                }}
                className="px-4 py-2 bg-red-650 hover:bg-red-700 text-white rounded-lg text-xs font-semibold cursor-pointer"
              >
                Confirmar Ocultação
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
