import React, { useState } from 'react';
import { BoardsState, KanbanBoard, KanbanCard, KanbanColumn } from '../types';
import { uid } from '../utils/formatters';
import {
  Plus,
  Trash2,
  GripVertical,
  ChevronLeft,
  ChevronRight,
  Edit2,
  X,
  Check,
} from 'lucide-react';

interface KanbanViewProps {
  boardsState: BoardsState;
  onUpdateBoards: (updater: (prev: BoardsState) => BoardsState) => void;
  onToast: (msg: string) => void;
}

export const KanbanView: React.FC<KanbanViewProps> = ({
  boardsState,
  onUpdateBoards,
  onToast,
}) => {
  const currentBoard =
    boardsState.list.find((b) => b.id === boardsState.sel) || boardsState.list[0];

  const [editingBoardName, setEditingBoardName] = useState<boolean>(false);
  const [boardNameInput, setBoardNameInput] = useState<string>('');
  const [newCardTexts, setNewCardTexts] = useState<Record<string, string>>({});
  const [editingCardId, setEditingCardId] = useState<string | null>(null);
  const [editingCardText, setEditingCardText] = useState<string>('');

  // Drag and drop state
  const [draggedCard, setDraggedCard] = useState<{
    cardId: string;
    sourceColId: string;
  } | null>(null);
  const [draggedColumnId, setDraggedColumnId] = useState<string | null>(null);

  // Switch boards
  const handleSelectBoard = (boardId: string) => {
    onUpdateBoards((prev) => ({ ...prev, sel: boardId }));
  };

  // Add new board
  const handleAddBoard = (name: string) => {
    if (boardsState.list.length >= 8) {
      onToast('Limite máximo de 8 quadros atingido.');
      return;
    }
    const cleanName = name.trim() || `Quadro ${boardsState.list.length + 1}`;
    const newBoard: KanbanBoard = {
      id: uid(),
      name: cleanName,
      cols: [
        { id: uid(), title: 'A fazer', cards: [] },
        { id: uid(), title: 'Em andamento', cards: [] },
        { id: uid(), title: 'Concluído', cards: [] },
      ],
    };
    onUpdateBoards((prev) => ({
      list: [...prev.list, newBoard],
      sel: newBoard.id,
    }));
    onToast(`Quadro "${cleanName}" criado.`);
  };

  // Rename board
  const handleSaveBoardName = () => {
    if (boardNameInput.trim()) {
      onUpdateBoards((prev) => ({
        ...prev,
        list: prev.list.map((b) =>
          b.id === currentBoard.id ? { ...b, name: boardNameInput.trim() } : b
        ),
      }));
    }
    setEditingBoardName(false);
  };

  // Delete board
  const handleDeleteBoard = () => {
    if (boardsState.list.length <= 1) return;
    if (window.confirm(`Tem certeza que deseja excluir o quadro "${currentBoard.name}"?`)) {
      onUpdateBoards((prev) => {
        const remaining = prev.list.filter((b) => b.id !== currentBoard.id);
        return {
          list: remaining,
          sel: remaining[0].id,
        };
      });
      onToast('Quadro excluído.');
    }
  };

  // Add Column
  const handleAddColumn = (title: string) => {
    if (currentBoard.cols.length >= 8) {
      onToast('Limite de 8 colunas atingido.');
      return;
    }
    const cleanTitle = title.trim();
    if (!cleanTitle) return;
    const newCol: KanbanColumn = {
      id: uid(),
      title: cleanTitle,
      cards: [],
    };
    onUpdateBoards((prev) => ({
      ...prev,
      list: prev.list.map((b) =>
        b.id === currentBoard.id ? { ...b, cols: [...b.cols, newCol] } : b
      ),
    }));
  };

  // Rename Column
  const handleRenameColumn = (colId: string, newTitle: string) => {
    const cleanTitle = newTitle.trim();
    if (!cleanTitle) return;
    onUpdateBoards((prev) => ({
      ...prev,
      list: prev.list.map((b) =>
        b.id === currentBoard.id
          ? {
              ...b,
              cols: b.cols.map((c) => (c.id === colId ? { ...c, title: cleanTitle } : c)),
            }
          : b
      ),
    }));
  };

  // Delete Column
  const handleDeleteColumn = (col: KanbanColumn) => {
    if (col.cards.length > 0) {
      if (!window.confirm(`A coluna "${col.title}" contém ${col.cards.length} cartões. Deseja excluir mesmo assim?`)) {
        return;
      }
    }
    onUpdateBoards((prev) => ({
      ...prev,
      list: prev.list.map((b) =>
        b.id === currentBoard.id
          ? { ...b, cols: b.cols.filter((c) => c.id !== col.id) }
          : b
      ),
    }));
  };

  // Add Card (with multiline paste support)
  const handleAddCard = (colId: string, text: string) => {
    const lines = text
      .split(/\r?\n/)
      .map((s) => s.trim())
      .filter(Boolean);
    if (!lines.length) return;

    const newCards: KanbanCard[] = lines.map((line) => ({
      id: uid(),
      text: line,
    }));

    onUpdateBoards((prev) => ({
      ...prev,
      list: prev.list.map((b) =>
        b.id === currentBoard.id
          ? {
              ...b,
              cols: b.cols.map((c) =>
                c.id === colId ? { ...c, cards: [...c.cards, ...newCards] } : c
              ),
            }
          : b
      ),
    }));

    setNewCardTexts((prev) => ({ ...prev, [colId]: '' }));
  };

  // Move Card between columns (Left/Right buttons)
  const handleMoveCardHorizontal = (
    currentColIndex: number,
    targetColIndex: number,
    card: KanbanCard
  ) => {
    if (targetColIndex < 0 || targetColIndex >= currentBoard.cols.length) return;
    onUpdateBoards((prev) => ({
      ...prev,
      list: prev.list.map((b) => {
        if (b.id !== currentBoard.id) return b;
        const colsCopy = b.cols.map((c) => ({ ...c, cards: [...c.cards] }));
        colsCopy[currentColIndex].cards = colsCopy[currentColIndex].cards.filter(
          (k) => k.id !== card.id
        );
        colsCopy[targetColIndex].cards.push(card);
        return { ...b, cols: colsCopy };
      }),
    }));
  };

  // Delete Card
  const handleDeleteCard = (colId: string, cardId: string) => {
    onUpdateBoards((prev) => ({
      ...prev,
      list: prev.list.map((b) =>
        b.id === currentBoard.id
          ? {
              ...b,
              cols: b.cols.map((c) =>
                c.id === colId ? { ...c, cards: c.cards.filter((k) => k.id !== cardId) } : c
              ),
            }
          : b
      ),
    }));
  };

  // Save edited card
  const handleSaveCardEdit = (colId: string, cardId: string) => {
    if (editingCardText.trim()) {
      onUpdateBoards((prev) => ({
        ...prev,
        list: prev.list.map((b) =>
          b.id === currentBoard.id
            ? {
                ...b,
                cols: b.cols.map((c) =>
                  c.id === colId
                    ? {
                        ...c,
                        cards: c.cards.map((k) =>
                          k.id === cardId ? { ...k, text: editingCardText.trim() } : k
                        ),
                      }
                    : c
                ),
              }
            : b
        ),
      }));
    }
    setEditingCardId(null);
  };

  // Drag and drop card handling
  const handleCardDragStart = (e: React.DragEvent, cardId: string, colId: string) => {
    e.stopPropagation();
    setDraggedCard({ cardId, sourceColId: colId });
    e.dataTransfer.setData('text/plain', cardId);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleCardDropOnCol = (targetColId: string, targetCardIndex?: number) => {
    if (!draggedCard) return;
    const { cardId, sourceColId } = draggedCard;

    onUpdateBoards((prev) => ({
      ...prev,
      list: prev.list.map((b) => {
        if (b.id !== currentBoard.id) return b;
        const newCols = b.cols.map((c) => ({ ...c, cards: [...c.cards] }));
        const sourceCol = newCols.find((c) => c.id === sourceColId);
        const targetCol = newCols.find((c) => c.id === targetColId);
        if (!sourceCol || !targetCol) return b;

        const cardIdx = sourceCol.cards.findIndex((k) => k.id === cardId);
        if (cardIdx < 0) return b;
        const [movedCard] = sourceCol.cards.splice(cardIdx, 1);

        if (targetCardIndex !== undefined && targetCardIndex >= 0) {
          targetCol.cards.splice(targetCardIndex, 0, movedCard);
        } else {
          targetCol.cards.push(movedCard);
        }

        return { ...b, cols: newCols };
      }),
    }));

    setDraggedCard(null);
  };

  // Drag and drop column handling
  const handleColumnDragStart = (e: React.DragEvent, colId: string) => {
    setDraggedColumnId(colId);
    e.dataTransfer.setData('text/plain', colId);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleColumnDrop = (targetColId: string) => {
    if (!draggedColumnId || draggedColumnId === targetColId) return;

    onUpdateBoards((prev) => ({
      ...prev,
      list: prev.list.map((b) => {
        if (b.id !== currentBoard.id) return b;
        const colsCopy = [...b.cols];
        const fromIdx = colsCopy.findIndex((c) => c.id === draggedColumnId);
        const toIdx = colsCopy.findIndex((c) => c.id === targetColId);
        if (fromIdx < 0 || toIdx < 0) return b;

        const [moved] = colsCopy.splice(fromIdx, 1);
        colsCopy.splice(toIdx, 0, moved);
        return { ...b, cols: colsCopy };
      }),
    }));

    setDraggedColumnId(null);
  };

  return (
    <div className="space-y-4">
      {/* Board Selector Bar */}
      <div className="flex flex-wrap items-center gap-2 pb-3 border-b border-slate-200/60 dark:border-slate-800/60">
        {boardsState.list.map((b) => {
          const isSelected = b.id === currentBoard.id;
          return (
            <div key={b.id} className="relative">
              {isSelected && editingBoardName ? (
                <div className="flex items-center gap-1">
                  <input
                    type="text"
                    value={boardNameInput}
                    autoFocus
                    onChange={(e) => setBoardNameInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') handleSaveBoardName();
                      if (e.key === 'Escape') setEditingBoardName(false);
                    }}
                    className="px-3 py-1.5 rounded-full text-xs font-bold border border-blue-500 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 outline-none shadow-sm"
                  />
                  <button
                    onClick={handleSaveBoardName}
                    className="p-1 rounded-full bg-blue-600 text-white"
                  >
                    <Check className="w-3.5 h-3.5" />
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => {
                    if (isSelected) {
                      setBoardNameInput(b.name);
                      setEditingBoardName(true);
                    } else {
                      handleSelectBoard(b.id);
                    }
                  }}
                  title={isSelected ? 'Clique para renomear' : 'Selecionar quadro'}
                  className={`px-3.5 py-1.5 rounded-full text-xs font-bold uppercase tracking-wider transition cursor-pointer ${
                    isSelected
                      ? 'bg-blue-600 text-white shadow-sm ring-2 ring-blue-500/20'
                      : 'bg-white/80 dark:bg-slate-800/80 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
                  }`}
                >
                  {b.name}
                </button>
              )}
            </div>
          );
        })}

        {boardsState.list.length < 8 && (
          <input
            type="text"
            placeholder="+ Novo quadro"
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                handleAddBoard(e.currentTarget.value);
                e.currentTarget.value = '';
              }
            }}
            className="px-3 py-1.5 rounded-full text-xs border border-dashed border-slate-300 dark:border-slate-700 bg-transparent text-slate-700 dark:text-slate-200 outline-none focus:ring-2 focus:ring-blue-500 w-28 sm:w-32"
          />
        )}

        <span className="text-xs text-slate-400 font-semibold ml-auto">
          {boardsState.list.length}/8 quadros
        </span>

        {boardsState.list.length > 1 && (
          <button
            onClick={handleDeleteBoard}
            className="p-1.5 rounded-lg text-slate-400 hover:text-rose-500 transition cursor-pointer"
            title="Excluir quadro selecionado"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Kanban Board Columns Horizontal Scroll */}
      <div className="flex gap-4 overflow-x-auto pb-6 items-start pt-1 min-h-[calc(100vh-230px)]">
        {currentBoard.cols.map((col, colIndex) => (
          <div
            key={col.id}
            onDragOver={(e) => e.preventDefault()}
            onDrop={() => handleCardDropOnCol(col.id)}
            className="w-72 sm:w-80 shrink-0 bg-slate-100/90 dark:bg-slate-900/90 border border-slate-200/80 dark:border-slate-800 rounded-2xl flex flex-col max-h-[80vh] shadow-sm"
          >
            {/* Column Header */}
            <div
              draggable
              onDragStart={(e) => handleColumnDragStart(e, col.id)}
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => {
                e.stopPropagation();
                handleColumnDrop(col.id);
              }}
              className="flex items-center gap-2 px-3 py-2.5 border-b border-slate-200/60 dark:border-slate-800 cursor-grab active:cursor-grabbing select-none"
            >
              <GripVertical className="w-4 h-4 text-slate-400 shrink-0" />
              <input
                type="text"
                defaultValue={col.title}
                onBlur={(e) => handleRenameColumn(col.id, e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') e.currentTarget.blur();
                }}
                className="font-bold text-xs uppercase tracking-wider text-slate-800 dark:text-slate-100 bg-transparent outline-none flex-1 truncate focus:bg-white dark:focus:bg-slate-800 px-1 py-0.5 rounded"
              />
              <span className="px-1.5 py-0.5 rounded-full text-[10px] font-bold bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-400">
                {col.cards.length}
              </span>
              <button
                onClick={() => handleDeleteColumn(col)}
                className="p-1 rounded-lg text-slate-400 hover:text-rose-500 transition cursor-pointer"
                title="Excluir coluna"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Cards List */}
            <div className="flex-1 overflow-y-auto p-2.5 space-y-2">
              {col.cards.map((card, cardIndex) => (
                <div
                  key={card.id}
                  draggable
                  onDragStart={(e) => handleCardDragStart(e, card.id, col.id)}
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={(e) => {
                    e.stopPropagation();
                    handleCardDropOnCol(col.id, cardIndex);
                  }}
                  className="group p-3 rounded-xl bg-white dark:bg-slate-800 border border-slate-200/80 dark:border-slate-700/80 shadow-xs hover:shadow-md transition-all cursor-grab active:cursor-grabbing text-xs text-slate-800 dark:text-slate-100 break-words"
                >
                  {editingCardId === card.id ? (
                    <div className="space-y-2">
                      <textarea
                        rows={2}
                        value={editingCardText}
                        onChange={(e) => setEditingCardText(e.target.value)}
                        className="w-full p-1.5 rounded-lg border border-blue-500 bg-slate-50 dark:bg-slate-900 text-xs outline-none"
                      />
                      <div className="flex justify-end gap-1">
                        <button
                          onClick={() => setEditingCardId(null)}
                          className="px-2 py-0.5 rounded bg-slate-200 dark:bg-slate-700 text-[10px] font-bold"
                        >
                          Cancelar
                        </button>
                        <button
                          onClick={() => handleSaveCardEdit(col.id, card.id)}
                          className="px-2 py-0.5 rounded bg-blue-600 text-white text-[10px] font-bold"
                        >
                          Salvar
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-start justify-between gap-2">
                      <span
                        onDoubleClick={() => {
                          setEditingCardId(card.id);
                          setEditingCardText(card.text);
                        }}
                        className="flex-1 select-text"
                      >
                        {card.text}
                      </span>

                      {/* Card Actions */}
                      <div className="flex items-center gap-0.5 opacity-90 sm:opacity-0 group-hover:opacity-100 transition shrink-0">
                        <button
                          onClick={() =>
                            handleMoveCardHorizontal(colIndex, colIndex - 1, card)
                          }
                          disabled={colIndex === 0}
                          className="p-1 rounded hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-400 hover:text-slate-700 dark:hover:text-white disabled:opacity-20 cursor-pointer"
                          title="Mover para a coluna anterior"
                        >
                          <ChevronLeft className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() =>
                            handleMoveCardHorizontal(colIndex, colIndex + 1, card)
                          }
                          disabled={colIndex === currentBoard.cols.length - 1}
                          className="p-1 rounded hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-400 hover:text-slate-700 dark:hover:text-white disabled:opacity-20 cursor-pointer"
                          title="Mover para a próxima coluna"
                        >
                          <ChevronRight className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => {
                            setEditingCardId(card.id);
                            setEditingCardText(card.text);
                          }}
                          className="p-1 rounded hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-400 hover:text-slate-700 dark:hover:text-white cursor-pointer"
                          title="Editar cartão"
                        >
                          <Edit2 className="w-3 h-3" />
                        </button>
                        <button
                          onClick={() => handleDeleteCard(col.id, card.id)}
                          className="p-1 rounded hover:bg-rose-50 dark:hover:bg-rose-950 text-slate-400 hover:text-rose-500 cursor-pointer"
                          title="Excluir cartão"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>

            {/* Add Card Footer */}
            <div className="p-2 border-t border-slate-200/60 dark:border-slate-800">
              <input
                type="text"
                placeholder="+ Adicionar cartão (Enter para salvar)"
                value={newCardTexts[col.id] || ''}
                onChange={(e) =>
                  setNewCardTexts((prev) => ({ ...prev, [col.id]: e.target.value }))
                }
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    handleAddCard(col.id, e.currentTarget.value);
                  }
                }}
                onPaste={(e) => {
                  const pastedText = e.clipboardData.getData('text');
                  const lines = pastedText
                    .split(/\r?\n/)
                    .map((s) => s.trim())
                    .filter(Boolean);
                  if (lines.length > 1) {
                    e.preventDefault();
                    handleAddCard(col.id, pastedText);
                  }
                }}
                className="w-full px-3 py-1.5 rounded-xl border border-transparent hover:border-slate-300 dark:hover:border-slate-700 focus:border-blue-500 bg-transparent focus:bg-white dark:focus:bg-slate-800 text-xs text-slate-800 dark:text-slate-100 outline-none transition"
              />
            </div>
          </div>
        ))}

        {/* Add New Column Box */}
        {currentBoard.cols.length < 8 ? (
          <div className="w-72 shrink-0 p-3 rounded-2xl bg-white/40 dark:bg-slate-800/40 border border-dashed border-slate-300 dark:border-slate-700">
            <input
              type="text"
              placeholder="+ Adicionar coluna (Enter)"
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  handleAddColumn(e.currentTarget.value);
                  e.currentTarget.value = '';
                }
              }}
              className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white/80 dark:bg-slate-800/80 text-xs font-bold text-slate-800 dark:text-slate-100 outline-none focus:ring-2 focus:ring-blue-500"
            />
            <div className="text-[10px] text-slate-400 mt-2 text-center font-semibold">
              {currentBoard.cols.length}/8 colunas utilizadas
            </div>
          </div>
        ) : (
          <div className="text-xs text-slate-400 p-3 italic">
            Limite de 8 colunas atingido (8/8)
          </div>
        )}
      </div>
    </div>
  );
};
