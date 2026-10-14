import React, { useState } from 'react';
import { 
  FileText, 
  Trash2, 
  Plus, 
  Eye, 
  X, 
  Edit3, 
  Image as ImageIcon, 
  BookOpen, 
  Code
} from 'lucide-react';
import { Article } from '../../types';
import { collection, addDoc, doc, deleteDoc, updateDoc } from 'firebase/firestore';
import { db } from '../../firebase';
import { toast } from 'sonner';

interface ArticlesAdminPageProps {
  articles: Article[];
}

export default function ArticlesAdminPage({ articles }: ArticlesAdminPageProps) {
  const [isAdding, setIsAdding] = useState(false);
  const [editingArticle, setEditingArticle] = useState<Article | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<{ id: string; title: string; message: string } | null>(null);
  const [previewMarkdown, setPreviewMarkdown] = useState('');
  const [newArticle, setNewArticle] = useState({
    title: '',
    category: 'Inventários e Partilhas',
    snippet: '',
    content: '',
    image: 'https://images.unsplash.com/photo-1589829545856-d10d557cf95f?auto=format&fit=crop&q=80',
    readTime: '4 min'
  });

  const handleEditClick = (art: Article) => {
    setEditingArticle(art);
    setNewArticle({
      title: art.title || '',
      category: art.category || 'Inventários e Partilhas',
      snippet: art.snippet || art.excerpt || '',
      content: art.content || '',
      image: art.image || art.imageUrl || 'https://images.unsplash.com/photo-1589829545856-d10d557cf95f?auto=format&fit=crop&q=80',
      readTime: art.readTime || '4 min'
    });
    setIsAdding(true);
  };

  const handleAddNewClick = () => {
    setEditingArticle(null);
    setNewArticle({
      title: '',
      category: 'Inventários e Partilhas',
      snippet: '',
      content: '',
      image: 'https://images.unsplash.com/photo-1589829545856-d10d557cf95f?auto=format&fit=crop&q=80',
      readTime: '4 min'
    });
    setIsAdding(true);
  };

  const handlePublish = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newArticle.title || !newArticle.content || !newArticle.snippet) {
      toast.error('Preencha os campos obrigatórios (*).');
      return;
    }

    try {
      if (editingArticle) {
        await updateDoc(doc(db, 'articles', editingArticle.id), {
          title: newArticle.title,
          category: newArticle.category,
          readTime: newArticle.readTime,
          snippet: newArticle.snippet,
          content: newArticle.content,
          image: newArticle.image,
        });
        toast.success('Artigo atualizado com sucesso!');
      } else {
        await addDoc(collection(db, 'articles'), {
          title: newArticle.title,
          category: newArticle.category,
          date: new Date().toLocaleDateString('pt-BR', { day: 'numeric', month: 'long', year: 'numeric' }),
          readTime: newArticle.readTime,
          snippet: newArticle.snippet,
          content: newArticle.content,
          image: newArticle.image,
          author: 'Dr. André Almeida',
          authorRole: 'Advogado Titular',
          createdAt: new Date().toISOString()
        });
        toast.success('Artigo acadêmico/noticioso publicado com sucesso!');
      }

      setIsAdding(false);
      setEditingArticle(null);
      setNewArticle({
        title: '',
        category: 'Inventários e Partilhas',
        snippet: '',
        content: '',
        image: 'https://images.unsplash.com/photo-1589829545856-d10d557cf95f?auto=format&fit=crop&q=80',
        readTime: '4 min'
      });
    } catch (err) {
      console.error(err);
      toast.error(editingArticle ? 'Erro ao atualizar artigo.' : 'Erro ao publicar artigo.');
    }
  };

  const handleDeleteArticle = (id: string) => {
    setDeleteConfirm({
      id,
      title: 'Excluir Artigo',
      message: 'Tem certeza de que deseja banir este artigo do portal público de forma definitiva?'
    });
  };

  return (
    <div className="space-y-6 text-neutral-100">
      
      <div className="flex justify-between items-center bg-neutral-900 border border-neutral-800 p-4 rounded-xl">
        <h2 className="text-sm font-semibold font-display text-neutral-200">Publicações e Doutrinas Jurídicas</h2>
        <button
          onClick={handleAddNewClick}
          className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold rounded-lg flex items-center space-x-1 transition-all cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          <span>Escrever Novo Artigo</span>
        </button>
      </div>

      {/* Articles table list */}
      <div className="bg-neutral-900 border border-neutral-800 rounded-xl overflow-x-auto">
        <table className="w-full text-left text-xs font-sans">
          <thead className="bg-neutral-950 border-b border-neutral-800 text-[11px] font-mono font-bold text-neutral-400 uppercase tracking-widest">
            <tr>
              <th className="px-6 py-3">Artigo Acadêmico</th>
              <th className="px-6 py-3">Editoria / Categoria</th>
              <th className="px-6 py-3">Data de Veiculação</th>
              <th className="px-6 py-3">Tempo Leitura</th>
              <th className="px-6 py-3 text-right">Ação</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-neutral-800/60">
            {articles.length > 0 ? (
              articles.map(art => (
                <tr key={art.id} className="hover:bg-neutral-850/40">
                  <td className="px-6 py-4">
                    <span className="font-semibold text-neutral-200 block text-sm">{art.title}</span>
                    <span className="text-[11px] text-neutral-500 line-clamp-1 mt-0.5">{art.snippet}</span>
                  </td>
                  <td className="px-6 py-3 capitalize">
                    <span className="bg-neutral-950 border border-neutral-800 px-2 py-0.5 rounded text-[10px] text-neutral-400 tracking-wider font-mono">
                      {art.category}
                    </span>
                  </td>
                  <td className="px-6 py-3 text-neutral-400 font-mono">
                    {art.date}
                  </td>
                  <td className="px-6 py-3 text-neutral-400 font-mono">
                    {art.readTime}
                  </td>
                  <td className="px-6 py-3 text-right">
                    <div className="flex items-center justify-end space-x-2">
                      <button
                        onClick={() => handleEditClick(art)}
                        className="p-1 px-2.5 bg-neutral-950 hover:bg-emerald-950/20 text-emerald-500 hover:text-emerald-400 border border-neutral-800 rounded text-xs transition-colors cursor-pointer"
                        title="Editar Artigo"
                      >
                        <Edit3 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => handleDeleteArticle(art.id)}
                        className="p-1 px-2.5 bg-neutral-950 hover:bg-red-950/20 text-red-500 hover:text-red-400 border border-neutral-800 rounded text-xs transition-colors cursor-pointer"
                        title="Excluir Artigo"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={5} className="text-center py-12 text-neutral-500">Nenhum artigo localizado publicado.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Publishing creation overlay editor modal */}
      {isAdding && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-neutral-900 border border-neutral-800 p-6 sm:p-8 rounded-2xl max-w-3xl w-full max-h-[92vh] overflow-y-auto space-y-6">
            <div className="flex justify-between items-center border-b border-neutral-800 pb-3">
              <h3 className="text-md font-bold text-neutral-100 font-display">
                {editingArticle ? 'Editar Artigo Acadêmico / Doutrinário' : 'Redigir Artigo Acadêmico / Doutrinário'}
              </h3>
              <button 
                onClick={() => {
                  setIsAdding(false);
                  setEditingArticle(null);
                }}
                className="p-1 hover:bg-neutral-850 rounded font-semibold text-neutral-400 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handlePublish} className="space-y-4 text-xs font-semibold">
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs uppercase font-mono font-bold tracking-wider mb-1.5 text-neutral-400">Título Principal *</label>
                  <input
                    type="text"
                    required
                    value={newArticle.title}
                    onChange={(e) => setNewArticle({ ...newArticle, title: e.target.value })}
                    placeholder="Ex: Mudanças no Aviso Prévio Proporcional em 2026"
                    className="w-full px-3 py-2 border border-neutral-850 bg-neutral-950 rounded-lg text-neutral-200 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs uppercase font-mono font-bold tracking-wider mb-1.5 text-neutral-400">Editoria do Artigo</label>
                  <select
                    value={newArticle.category}
                    onChange={(e) => setNewArticle({ ...newArticle, category: e.target.value })}
                    className="w-full px-3 py-2 border border-neutral-850 bg-neutral-950 rounded-lg text-neutral-200 focus:outline-none text-xs"
                  >
                    <option value="Inventários e Partilhas">Inventários e Partilhas</option>
                    <option value="Direito Imobiliário">Direito Imobiliário</option>
                    <option value="Direito de Família">Direito de Família</option>
                    <option value="Direito Civil e Contratos">Direito Civil e Contratos</option>
                    <option value="Registro de Marcas">Registro de Marcas</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs uppercase font-mono font-bold tracking-wider mb-1.5 text-neutral-400">URL Imagem Capa (Unsplash, etc)</label>
                  <input
                    type="text"
                    value={newArticle.image}
                    onChange={(e) => setNewArticle({ ...newArticle, image: e.target.value })}
                    className="w-full px-3 py-2 border border-neutral-850 bg-neutral-950 rounded-lg text-neutral-200 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs uppercase font-mono font-bold tracking-wider mb-1.5 text-neutral-400">Tempo Estimado de Leitura</label>
                  <input
                    type="text"
                    value={newArticle.readTime}
                    onChange={(e) => setNewArticle({ ...newArticle, readTime: e.target.value })}
                    placeholder="Ex: 5 min"
                    className="w-full px-3 py-2 border border-neutral-850 bg-neutral-950 rounded-lg text-neutral-200 focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs uppercase font-mono font-bold tracking-wider mb-1.5 text-neutral-400">Chamada / Snippet Breve *</label>
                <input
                  type="text"
                  required
                  value={newArticle.snippet}
                  onChange={(e) => setNewArticle({ ...newArticle, snippet: e.target.value })}
                  placeholder="Sumarize as diretrizes do artigo em até 2 linhas que guiará a atração do leitor no portal público..."
                  className="w-full px-3 py-2 border border-neutral-850 bg-neutral-950 rounded-lg text-neutral-200 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs uppercase font-mono font-bold tracking-wider mb-1.5 text-neutral-400">Conteúdo Acadêmico em Markdown *</label>
                <textarea
                  required
                  rows={8}
                  value={newArticle.content}
                  onChange={(e) => setNewArticle({ ...newArticle, content: e.target.value })}
                  placeholder="Redija o artigo jurídico estruturando títulos (###), subtítulos, listas, parágrafos em markdown..."
                  className="w-full px-3 py-2 border border-neutral-850 bg-neutral-950 rounded-lg text-neutral-200 focus:outline-none font-mono"
                />
              </div>

              <div className="flex justify-end space-x-3 pt-3 border-t border-neutral-850">
                <button
                  type="button"
                  onClick={() => {
                    setIsAdding(false);
                    setEditingArticle(null);
                  }}
                  className="px-4 py-2 border border-neutral-800 text-neutral-400 hover:bg-neutral-850 rounded-lg text-xs font-semibold cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-semibold transition-transform cursor-pointer"
                >
                  {editingArticle ? 'Salvar Alterações' : 'Publicar Artigo'}
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
                    await updateDoc(doc(db, 'articles', deleteConfirm.id), {
                      deleted: true,
                      deletedAt: new Date().toISOString()
                    });
                    toast.success('Artigo ocultado com sucesso (Soft Delete).');
                  } catch (err) {
                    console.error(err);
                    toast.error('Erro ao ocultar artigo.');
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
