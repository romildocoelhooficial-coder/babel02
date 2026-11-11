import React, { useState, useEffect } from 'react';
import { 
  Shield, 
  Key, 
  Volume2, 
  Save, 
  LogOut, 
  X, 
  Check, 
  AlertTriangle, 
  ExternalLink,
  Users,
  UserPlus,
  Edit2,
  Trash2,
  Search,
  Calendar,
  Phone,
  Mail,
  User,
  RefreshCw,
  Lock
} from 'lucide-react';

interface AdminModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export interface UserItem {
  id: string;
  name: string;
  email: string;
  phone: string;
  createdAt: string;
  role: 'user' | 'admin';
}

export const AdminModal: React.FC<AdminModalProps> = ({ isOpen, onClose }) => {
  const [activeTab, setActiveTab] = useState<'users' | 'fishaudio'>('users');
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [loginUser, setLoginUser] = useState('');
  const [loginPass, setLoginPass] = useState('');
  const [loginError, setLoginError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  // Users CRUD state
  const [users, setUsers] = useState<UserItem[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [isEditingUser, setIsEditingUser] = useState(false);
  const [editingUserId, setEditingUserId] = useState<string | null>(null);
  const [userFormData, setUserFormData] = useState({
    name: '',
    email: '',
    phone: '',
    password: '',
    role: 'user' as 'user' | 'admin'
  });
  const [userActionMsg, setUserActionMsg] = useState<{ type: 'ok' | 'err'; text: string } | null>(null);
  const [userToDelete, setUserToDelete] = useState<UserItem | null>(null);

  // Fish Audio config fields
  const [fishApiKey, setFishApiKey] = useState('');
  const [fishApiKeyPlaceholder, setFishApiKeyPlaceholder] = useState('Cole a chave da Fish Audio');
  const [fishModel, setFishModel] = useState('s2.1-pro-free');
  const [fishVoiceId, setFishVoiceId] = useState('');
  const [fishVoiceIdPt, setFishVoiceIdPt] = useState('');
  const [fishVoiceIdEn, setFishVoiceIdEn] = useState('');
  const [newAdminUser, setNewAdminUser] = useState('');
  const [newAdminPass, setNewAdminPass] = useState('');
  const [configMsg, setConfigMsg] = useState<{ type: 'ok' | 'err'; text: string } | null>(null);

  useEffect(() => {
    if (isOpen) {
      checkAuthStatus();
    }
  }, [isOpen]);

  const checkAuthStatus = async () => {
    try {
      const res = await fetch('/api/admin/status');
      const data = await res.json();
      if (data.loggedIn) {
        setIsLoggedIn(true);
        loadUsers();
        loadConfig();
      } else {
        setIsLoggedIn(false);
      }
    } catch {
      setIsLoggedIn(false);
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError('');
    setIsLoading(true);
    try {
      const res = await fetch('/api/admin/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user: loginUser, pass: loginPass })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Credenciais inválidas');
      setIsLoggedIn(true);
      setLoginUser('');
      setLoginPass('');
      loadUsers();
      loadConfig();
    } catch (err: any) {
      setLoginError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  // ========== USERS CRUD METHODS ==========

  const loadUsers = async () => {
    try {
      const res = await fetch('/api/admin/users');
      if (!res.ok) throw new Error('Não autorizado');
      const data = await res.json();
      if (data.users) {
        setUsers(data.users);
      }
    } catch (err: any) {
      console.error('Erro ao carregar usuários:', err);
    }
  };

  const openCreateUserModal = () => {
    setEditingUserId(null);
    setUserFormData({
      name: '',
      email: '',
      phone: '',
      password: '',
      role: 'user'
    });
    setUserActionMsg(null);
    setIsEditingUser(true);
  };

  const openEditUserModal = (u: UserItem) => {
    setEditingUserId(u.id);
    setUserFormData({
      name: u.name,
      email: u.email,
      phone: u.phone,
      password: '',
      role: u.role
    });
    setUserActionMsg(null);
    setIsEditingUser(true);
  };

  const handleSaveUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setUserActionMsg(null);
    setIsLoading(true);

    try {
      if (editingUserId) {
        // UPDATE USER
        const res = await fetch(`/api/admin/users/${editingUserId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(userFormData)
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Erro ao atualizar usuário');
        setUserActionMsg({ type: 'ok', text: 'Usuário atualizado com sucesso!' });
      } else {
        // CREATE USER
        const res = await fetch('/api/admin/users', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(userFormData)
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Erro ao criar usuário');
        setUserActionMsg({ type: 'ok', text: 'Novo usuário cadastrado com sucesso!' });
      }

      await loadUsers();
      setTimeout(() => {
        setIsEditingUser(false);
        setUserActionMsg(null);
      }, 700);
    } catch (err: any) {
      setUserActionMsg({ type: 'err', text: err.message });
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteUser = async (id: string) => {
    setUserActionMsg(null);
    setIsLoading(true);
    try {
      const res = await fetch(`/api/admin/users/${id}`, {
        method: 'DELETE'
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Erro ao excluir usuário');
      setUserToDelete(null);
      await loadUsers();
    } catch (err: any) {
      alert(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  // Format date pt-BR
  const formatDate = (isoString: string) => {
    try {
      const d = new Date(isoString);
      return d.toLocaleDateString('pt-BR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch {
      return isoString;
    }
  };

  // Filter users by search query
  const filteredUsers = users.filter(u => {
    const q = searchQuery.toLowerCase();
    return (
      u.name.toLowerCase().includes(q) ||
      u.email.toLowerCase().includes(q) ||
      u.phone.toLowerCase().includes(q)
    );
  });

  // ========== FISH AUDIO CONFIG METHODS ==========

  const loadConfig = async () => {
    try {
      const res = await fetch('/api/admin/config');
      if (!res.ok) throw new Error('Não autorizado');
      const data = await res.json();
      setFishApiKeyPlaceholder(data.fishApiKeySet ? `Chave atual: ${data.fishApiKey}` : 'Cole a chave da Fish Audio');
      setFishModel(data.fishModel || 's2.1-pro-free');
      setFishVoiceId(data.fishVoiceId || '');
      setFishVoiceIdPt(data.fishVoiceIdPt || '');
      setFishVoiceIdEn(data.fishVoiceIdEn || '');
    } catch (err: any) {
      setConfigMsg({ type: 'err', text: 'Erro ao carregar configurações: ' + err.message });
    }
  };

  const handleSaveConfig = async (e: React.FormEvent) => {
    e.preventDefault();
    setConfigMsg(null);
    setIsLoading(true);
    try {
      const body: any = {
        fishModel,
        fishVoiceId,
        fishVoiceIdPt,
        fishVoiceIdEn,
      };
      if (fishApiKey.trim() && !fishApiKey.includes('*')) {
        body.fishApiKey = fishApiKey.trim();
      }
      if (newAdminUser.trim()) body.newAdminUser = newAdminUser.trim();
      if (newAdminPass.trim()) body.newAdminPass = newAdminPass.trim();

      const res = await fetch('/api/admin/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Erro ao salvar');

      setConfigMsg({ type: 'ok', text: 'Configuração da Fish Audio e segurança salvas com sucesso!' });
      setFishApiKey('');
      setNewAdminPass('');
      loadConfig();
    } catch (err: any) {
      setConfigMsg({ type: 'err', text: err.message });
    } finally {
      setIsLoading(false);
    }
  };

  const handleLogout = async () => {
    await fetch('/api/admin/logout', { method: 'POST' });
    setIsLoggedIn(false);
    setUserActionMsg(null);
    setConfigMsg(null);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-md p-3 md:p-6 animate-fadeIn">
      <div className="w-full max-w-4xl max-h-[92vh] overflow-hidden flex flex-col rounded-3xl bg-[#120303] border-2 border-amber-500/40 shadow-[0_0_60px_rgba(255,100,0,0.35)] text-zinc-100 relative">
        
        {/* Top Header */}
        <div className="px-6 py-4 border-b border-amber-500/30 flex items-center justify-between bg-black/40">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-gradient-to-br from-amber-500/20 to-red-500/20 border border-amber-500/50 text-amber-400 shadow-[0_0_15px_rgba(255,179,71,0.2)]">
              <Shield className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-lg md:text-xl font-black text-amber-400 uppercase tracking-widest">
                Painel Administrativo HUD
              </h2>
              <p className="text-xs text-amber-200/70">
                CRUD de Usuários & Motor Fish Audio TTS
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {isLoggedIn && (
              <button
                onClick={handleLogout}
                className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-black/60 hover:bg-white/10 border border-white/10 text-xs text-zinc-300 hover:text-white transition cursor-pointer"
                title="Desconectar da Administração"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span>Sair</span>
              </button>
            )}
            <button
              onClick={onClose}
              className="p-2 rounded-xl text-zinc-400 hover:text-white hover:bg-white/10 transition cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Content Container */}
        <div className="flex-1 overflow-y-auto p-4 md:p-6">
          {!isLoggedIn ? (
            /* ADMIN LOGIN VIEW */
            <div className="max-w-md mx-auto py-6">
              <form onSubmit={handleLogin} className="space-y-4">
                <div className="p-4 rounded-2xl bg-black/50 border border-amber-500/30 text-xs text-amber-200/90 mb-4 shadow-sm">
                  🛡️ <strong>Acesso Restrito:</strong> Digite as credenciais do administrador para gerenciar os usuários e o Fish Audio.
                  <div className="mt-1 text-zinc-400">Padrão: <span className="text-white">admin</span> / <span className="text-white">babel2026</span></div>
                </div>

                <div>
                  <label className="block text-xs uppercase font-extrabold text-amber-300 tracking-wider mb-1.5">Usuário Admin</label>
                  <input
                    type="text"
                    value={loginUser}
                    onChange={(e) => setLoginUser(e.target.value)}
                    placeholder="admin"
                    className="w-full px-4 py-2.5 rounded-xl bg-black/60 border border-amber-500/30 text-white font-medium focus:border-cyan-400 focus:outline-none transition text-sm"
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs uppercase font-extrabold text-amber-300 tracking-wider mb-1.5">Senha</label>
                  <input
                    type="password"
                    value={loginPass}
                    onChange={(e) => setLoginPass(e.target.value)}
                    placeholder="••••••••"
                    className="w-full px-4 py-2.5 rounded-xl bg-black/60 border border-amber-500/30 text-white font-medium focus:border-cyan-400 focus:outline-none transition text-sm"
                    required
                  />
                </div>

                {loginError && (
                  <div className="flex items-center gap-2 p-3 rounded-xl bg-red-950/50 border border-red-500/40 text-red-300 text-xs font-semibold">
                    <AlertTriangle className="w-4 h-4 text-red-400 shrink-0" />
                    <span>{loginError}</span>
                  </div>
                )}

                <button
                  type="submit"
                  disabled={isLoading}
                  className="w-full mt-2 py-3 rounded-xl bg-gradient-to-r from-amber-600 via-orange-600 to-red-700 hover:from-amber-500 hover:to-red-600 text-white font-black text-xs uppercase tracking-wider transition shadow-[0_0_20px_rgba(255,100,0,0.3)] cursor-pointer"
                >
                  {isLoading ? 'Autenticando...' : 'Acessar Central Administrativa'}
                </button>
              </form>
            </div>
          ) : (
            /* AUTHENTICATED TABS VIEW */
            <div>
              {/* Tab Navigation */}
              <div className="flex items-center gap-2 border-b border-white/10 pb-4 mb-6">
                <button
                  type="button"
                  onClick={() => setActiveTab('users')}
                  className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider transition cursor-pointer ${
                    activeTab === 'users'
                      ? 'bg-gradient-to-r from-amber-600 to-orange-600 text-white shadow-[0_0_15px_rgba(255,100,0,0.35)]'
                      : 'bg-black/40 text-zinc-400 hover:text-white border border-white/5'
                  }`}
                >
                  <Users className="w-4 h-4" />
                  <span>Cadastros & Usuários ({users.length})</span>
                </button>

                <button
                  type="button"
                  onClick={() => setActiveTab('fishaudio')}
                  className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider transition cursor-pointer ${
                    activeTab === 'fishaudio'
                      ? 'bg-gradient-to-r from-amber-600 to-orange-600 text-white shadow-[0_0_15px_rgba(255,100,0,0.35)]'
                      : 'bg-black/40 text-zinc-400 hover:text-white border border-white/5'
                  }`}
                >
                  <Volume2 className="w-4 h-4" />
                  <span>Configuração Fish Audio</span>
                </button>
              </div>

              {/* TAB 1: USERS CRUD */}
              {activeTab === 'users' && (
                <div className="space-y-4">
                  {/* Action Bar */}
                  <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
                    <div className="relative w-full sm:w-72">
                      <Search className="w-4 h-4 text-zinc-400 absolute left-3 top-3" />
                      <input
                        type="text"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        placeholder="Buscar por nome, e-mail ou tel..."
                        className="w-full pl-9 pr-4 py-2 rounded-xl bg-black/60 border border-white/10 text-white text-xs focus:border-cyan-400 focus:outline-none"
                      />
                    </div>

                    <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
                      <button
                        onClick={loadUsers}
                        className="p-2 rounded-xl bg-black/50 hover:bg-white/10 border border-white/10 text-zinc-300 hover:text-white transition cursor-pointer"
                        title="Atualizar lista de cadastros"
                      >
                        <RefreshCw className="w-4 h-4" />
                      </button>

                      <button
                        onClick={openCreateUserModal}
                        className="flex items-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-700 hover:from-emerald-500 hover:to-teal-600 text-white font-extrabold text-xs uppercase tracking-wider shadow-md transition cursor-pointer"
                      >
                        <UserPlus className="w-4 h-4" />
                        <span>Novo Usuário</span>
                      </button>
                    </div>
                  </div>

                  {/* Users List / Table */}
                  <div className="border border-white/10 rounded-2xl overflow-hidden bg-black/40 shadow-inner">
                    <div className="overflow-x-auto">
                      <table className="w-full text-left text-xs">
                        <thead className="bg-[#1a0505] text-amber-300 uppercase tracking-wider font-extrabold border-b border-white/10">
                          <tr>
                            <th className="p-3.5">Nome / Operador</th>
                            <th className="p-3.5">E-mail</th>
                            <th className="p-3.5">Telefone</th>
                            <th className="p-3.5">Data de Cadastro</th>
                            <th className="p-3.5">Cargo</th>
                            <th className="p-3.5 text-right">Ações</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-white/5">
                          {filteredUsers.length === 0 ? (
                            <tr>
                              <td colSpan={6} className="p-8 text-center text-zinc-400">
                                {searchQuery ? 'Nenhum usuário encontrado para a busca.' : 'Nenhum usuário cadastrado ainda.'}
                              </td>
                            </tr>
                          ) : (
                            filteredUsers.map((u) => (
                              <tr key={u.id} className="hover:bg-white/5 transition">
                                <td className="p-3.5 font-bold text-white flex items-center gap-2">
                                  <div className="w-7 h-7 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/40 flex items-center justify-center font-black text-xs shrink-0">
                                    {u.name.charAt(0).toUpperCase()}
                                  </div>
                                  <span className="truncate max-w-[150px]">{u.name}</span>
                                </td>
                                <td className="p-3.5 text-zinc-300">
                                  <div className="flex items-center gap-1.5">
                                    <Mail className="w-3 h-3 text-zinc-500" />
                                    <span>{u.email}</span>
                                  </div>
                                </td>
                                <td className="p-3.5 text-zinc-300">
                                  <div className="flex items-center gap-1.5">
                                    <Phone className="w-3 h-3 text-zinc-500" />
                                    <span>{u.phone}</span>
                                  </div>
                                </td>
                                <td className="p-3.5 text-amber-200/90 whitespace-nowrap">
                                  <div className="flex items-center gap-1.5">
                                    <Calendar className="w-3 h-3 text-amber-400" />
                                    <span>{formatDate(u.createdAt)}</span>
                                  </div>
                                </td>
                                <td className="p-3.5">
                                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wider ${
                                    u.role === 'admin'
                                      ? 'bg-amber-950/80 text-amber-400 border border-amber-500/40'
                                      : 'bg-cyan-950/80 text-cyan-400 border border-cyan-500/40'
                                  }`}>
                                    {u.role === 'admin' ? 'Admin' : 'Operador'}
                                  </span>
                                </td>
                                <td className="p-3.5 text-right whitespace-nowrap">
                                  <div className="flex items-center justify-end gap-1.5">
                                    <button
                                      onClick={() => openEditUserModal(u)}
                                      className="p-1.5 rounded-lg bg-blue-950/60 hover:bg-blue-900 border border-blue-500/40 text-blue-300 hover:text-white transition cursor-pointer"
                                      title="Editar Usuário"
                                    >
                                      <Edit2 className="w-3.5 h-3.5" />
                                    </button>
                                    <button
                                      onClick={() => setUserToDelete(u)}
                                      className="p-1.5 rounded-lg bg-red-950/60 hover:bg-red-900 border border-red-500/40 text-red-300 hover:text-white transition cursor-pointer"
                                      title="Excluir Usuário"
                                    >
                                      <Trash2 className="w-3.5 h-3.5" />
                                    </button>
                                  </div>
                                </td>
                              </tr>
                            ))
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              )}

              {/* TAB 2: FISH AUDIO CONFIG & SECURITY */}
              {activeTab === 'fishaudio' && (
                <form onSubmit={handleSaveConfig} className="space-y-4">
                  {configMsg && (
                    <div className={`flex items-center gap-2 p-3 rounded-xl text-xs font-semibold ${configMsg.type === 'ok' ? 'bg-emerald-950/60 border border-emerald-500/40 text-emerald-300' : 'bg-red-950/60 border border-red-500/40 text-red-300'}`}>
                      {configMsg.type === 'ok' ? <Check className="w-4 h-4 text-emerald-400" /> : <AlertTriangle className="w-4 h-4 text-red-400" />}
                      <span>{configMsg.text}</span>
                    </div>
                  )}

                  <div className="space-y-3 bg-black/40 p-4 rounded-2xl border border-amber-500/20">
                    <div className="flex items-center justify-between">
                      <label className="text-xs uppercase font-bold text-cyan-400 tracking-wider flex items-center gap-1.5">
                        <Key className="w-3.5 h-3.5" /> API Key Fish Audio
                      </label>
                      <a
                        href="https://fish.audio"
                        target="_blank"
                        rel="noreferrer"
                        className="text-[11px] text-amber-400 hover:text-cyan-300 flex items-center gap-1 underline"
                      >
                        fish.audio <ExternalLink className="w-3 h-3" />
                      </a>
                    </div>
                    <input
                      type="password"
                      value={fishApiKey}
                      onChange={(e) => setFishApiKey(e.target.value)}
                      placeholder={fishApiKeyPlaceholder}
                      className="w-full px-4 py-2.5 rounded-xl bg-black/60 border border-amber-500/30 text-white text-sm focus:border-cyan-400 focus:outline-none transition"
                    />
                    <p className="text-[11px] text-zinc-400">
                      A chave fica armazenada com segurança no servidor e não é exposta aos clientes.
                    </p>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs uppercase font-bold text-amber-300 tracking-wider mb-1">Modelo Neural</label>
                      <select
                        value={fishModel}
                        onChange={(e) => setFishModel(e.target.value)}
                        className="w-full px-3.5 py-2.5 rounded-xl bg-black/60 border border-amber-500/30 text-white text-sm focus:border-cyan-400 focus:outline-none"
                      >
                        <option value="s2.1-pro-free">s2.1-pro-free (Gratuito / Testes)</option>
                        <option value="s2.1-pro">s2.1-pro (Recomendado)</option>
                        <option value="s2-pro">s2-pro</option>
                        <option value="s1">s1 (Legado)</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs uppercase font-bold text-amber-300 tracking-wider mb-1">Voice ID Geral</label>
                      <input
                        type="text"
                        value={fishVoiceId}
                        onChange={(e) => setFishVoiceId(e.target.value)}
                        placeholder="Ex: 9a9cf47702da476aa4629e2506d4a857"
                        className="w-full px-3.5 py-2.5 rounded-xl bg-black/60 border border-amber-500/30 text-white text-sm focus:border-cyan-400 focus:outline-none"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs uppercase font-bold text-emerald-400 tracking-wider mb-1">Voice ID Português 🇧🇷</label>
                      <input
                        type="text"
                        value={fishVoiceIdPt}
                        onChange={(e) => setFishVoiceIdPt(e.target.value)}
                        placeholder="ID específico PT (opcional)"
                        className="w-full px-3.5 py-2.5 rounded-xl bg-black/60 border border-amber-500/30 text-white text-sm focus:border-cyan-400 focus:outline-none"
                      />
                    </div>

                    <div>
                      <label className="block text-xs uppercase font-bold text-blue-400 tracking-wider mb-1">Voice ID Inglês 🇺🇸</label>
                      <input
                        type="text"
                        value={fishVoiceIdEn}
                        onChange={(e) => setFishVoiceIdEn(e.target.value)}
                        placeholder="ID específico EN (opcional)"
                        className="w-full px-3.5 py-2.5 rounded-xl bg-black/60 border border-amber-500/30 text-white text-sm focus:border-cyan-400 focus:outline-none"
                      />
                    </div>
                  </div>

                  <div className="p-3.5 bg-black/30 rounded-2xl border border-white/5 space-y-2 mt-4">
                    <h4 className="text-xs font-bold text-amber-300 uppercase tracking-wider">Segurança: Alterar Usuário/Senha Admin Master</h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                      <input
                        type="text"
                        value={newAdminUser}
                        onChange={(e) => setNewAdminUser(e.target.value)}
                        placeholder="Novo usuário admin (opcional)"
                        className="px-3 py-2 rounded-xl bg-black/50 border border-white/10 text-xs text-white"
                      />
                      <input
                        type="password"
                        value={newAdminPass}
                        onChange={(e) => setNewAdminPass(e.target.value)}
                        placeholder="Nova senha admin (mín. 6 chars)"
                        className="px-3 py-2 rounded-xl bg-black/50 border border-white/10 text-xs text-white"
                      />
                    </div>
                  </div>

                  <div className="flex items-center gap-3 pt-3">
                    <button
                      type="submit"
                      disabled={isLoading}
                      className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl bg-gradient-to-r from-amber-600 via-orange-600 to-red-700 hover:from-amber-500 hover:to-red-600 text-white font-black text-xs uppercase tracking-wider shadow-lg transition cursor-pointer"
                    >
                      <Save className="w-4 h-4" />
                      <span>{isLoading ? 'Salvando...' : 'Salvar Configurações Fish Audio'}</span>
                    </button>
                  </div>
                </form>
              )}
            </div>
          )}
        </div>

        {/* MODAL EDIT / CREATE USER SUB-MODAL */}
        {isEditingUser && (
          <div className="fixed inset-0 z-60 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-fadeIn">
            <div className="w-full max-w-md rounded-2xl bg-[#180505] border border-amber-500/40 p-5 md:p-6 shadow-2xl relative text-left">
              <button
                onClick={() => setIsEditingUser(false)}
                className="absolute top-4 right-4 p-1.5 text-zinc-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>

              <h3 className="text-base font-black text-amber-400 uppercase tracking-wider mb-4 flex items-center gap-2">
                {editingUserId ? <Edit2 className="w-4 h-4" /> : <UserPlus className="w-4 h-4" />}
                <span>{editingUserId ? 'Editar Cadastro de Usuário' : 'Novo Cadastro de Usuário'}</span>
              </h3>

              {userActionMsg && (
                <div className={`mb-3 p-3 rounded-xl text-xs font-semibold ${userActionMsg.type === 'ok' ? 'bg-emerald-950/70 border border-emerald-500/40 text-emerald-300' : 'bg-red-950/70 border border-red-500/40 text-red-300'}`}>
                  {userActionMsg.text}
                </div>
              )}

              <form onSubmit={handleSaveUser} className="space-y-3">
                <div>
                  <label className="block text-xs uppercase font-bold text-amber-300 mb-1">Nome Completo</label>
                  <input
                    type="text"
                    value={userFormData.name}
                    onChange={(e) => setUserFormData({ ...userFormData, name: e.target.value })}
                    required
                    className="w-full px-3 py-2 rounded-xl bg-black/60 border border-white/10 text-white text-xs focus:border-cyan-400 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs uppercase font-bold text-amber-300 mb-1">E-mail</label>
                  <input
                    type="email"
                    value={userFormData.email}
                    onChange={(e) => setUserFormData({ ...userFormData, email: e.target.value })}
                    required
                    className="w-full px-3 py-2 rounded-xl bg-black/60 border border-white/10 text-white text-xs focus:border-cyan-400 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs uppercase font-bold text-amber-300 mb-1">Telefone / WhatsApp</label>
                  <input
                    type="text"
                    value={userFormData.phone}
                    onChange={(e) => setUserFormData({ ...userFormData, phone: e.target.value })}
                    required
                    placeholder="(11) 99999-9999"
                    className="w-full px-3 py-2 rounded-xl bg-black/60 border border-white/10 text-white text-xs focus:border-cyan-400 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs uppercase font-bold text-amber-300 mb-1">
                    {editingUserId ? 'Nova Senha (deixe em branco para manter)' : 'Senha de Acesso'}
                  </label>
                  <input
                    type="password"
                    value={userFormData.password}
                    onChange={(e) => setUserFormData({ ...userFormData, password: e.target.value })}
                    placeholder={editingUserId ? 'Manter senha atual' : 'Mínimo 4 caracteres'}
                    required={!editingUserId}
                    className="w-full px-3 py-2 rounded-xl bg-black/60 border border-white/10 text-white text-xs focus:border-cyan-400 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs uppercase font-bold text-amber-300 mb-1">Nível de Permissão</label>
                  <select
                    value={userFormData.role}
                    onChange={(e: any) => setUserFormData({ ...userFormData, role: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-black/60 border border-white/10 text-white text-xs focus:border-cyan-400 focus:outline-none"
                  >
                    <option value="user">Operador Padrão (user)</option>
                    <option value="admin">Administrador (admin)</option>
                  </select>
                </div>

                <div className="flex items-center gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setIsEditingUser(false)}
                    className="flex-1 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-zinc-300 text-xs font-semibold"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    disabled={isLoading}
                    className="flex-1 py-2.5 rounded-xl bg-gradient-to-r from-amber-600 to-orange-600 text-white text-xs font-black uppercase tracking-wider hover:brightness-110 shadow-md"
                  >
                    {isLoading ? 'Salvando...' : 'Salvar Usuário'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* MODAL CONFIRM DELETE */}
        {userToDelete && (
          <div className="fixed inset-0 z-60 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-fadeIn">
            <div className="w-full max-w-sm rounded-2xl bg-[#1c0505] border border-red-500/50 p-6 shadow-2xl text-center">
              <div className="w-12 h-12 rounded-full bg-red-950 text-red-400 border border-red-500/40 flex items-center justify-center mx-auto mb-3">
                <Trash2 className="w-6 h-6" />
              </div>
              <h4 className="text-base font-bold text-white mb-2">Excluir Usuário?</h4>
              <p className="text-xs text-zinc-300 mb-4">
                Deseja realmente remover <strong>{userToDelete.name}</strong> ({userToDelete.email})? Esta ação não pode ser desfeita.
              </p>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setUserToDelete(null)}
                  className="flex-1 py-2 rounded-xl bg-white/10 hover:bg-white/15 text-zinc-300 text-xs font-semibold"
                >
                  Cancelar
                </button>
                <button
                  onClick={() => handleDeleteUser(userToDelete.id)}
                  disabled={isLoading}
                  className="flex-1 py-2 rounded-xl bg-red-600 hover:bg-red-700 text-white text-xs font-bold uppercase tracking-wider"
                >
                  {isLoading ? 'Excluindo...' : 'Confirmar Exclusão'}
                </button>
              </div>
            </div>
          </div>
        )}

      </div>
    </div>
  );
};
