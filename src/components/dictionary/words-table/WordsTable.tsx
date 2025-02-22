import {
  createColumnHelper,
  flexRender,
  getCoreRowModel,
  useReactTable,
} from '@tanstack/react-table';
import { Button } from '@/components/ui/button';
import Icon from '@/components/common/Icon';
import { ProgressCircle } from '@/components/ui/progress-circle';
import {
  EditWordFormData,
  WordResponse,
  WordCategory,
} from '@/lib/types/dictionary';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAppDispatch, useAppSelector } from '@/redux/hooks';
import { useState } from 'react';
import {
  deleteWord,
  fetchWords,
  editWord,
} from '@/redux/features/dictionary/operations';
import { showSuccess } from '@/lib/utils';
import { EditWordModal } from './EditWordModal';
import { WORDS_PER_PAGE } from '@/lib/constants/dashboard';
import { selectCategories } from '@/redux/features/dictionary/selectors';

type WordsTableProps = {
  words: WordResponse[];
  isLoading: boolean;
} & (
  | { variant: 'dictionary' }
  | {
      variant: 'recommend';
      onWordAdd: (wordId: string) => void;
      addingWordIds?: string[];
    }
);

const columnHelper = createColumnHelper<WordResponse>();

const baseCellStyles = 'px-[22px] py-[16px] font-primary text-xl';
const tableBorderStyles = 'border-b border-table-border';

const columnWidths = {
  dictionary: {
    word: 'w-[25%] min-w-[180px]',
    translation: 'w-[25%] min-w-[180px]',
    category: 'w-[20%] min-w-[140px]',
    progress: 'w-[15%] min-w-[120px]',
    actions: 'w-[15%] min-w-[100px]',
  },
  recommend: {
    word: 'w-[30%] min-w-[200px]',
    translation: 'w-[30%] min-w-[200px]',
    category: 'w-[20%] min-w-[140px]',
    actions: 'w-[20%] min-w-[160px]',
  },
} as const;

export function WordsTable(props: WordsTableProps) {
  const { variant, words, isLoading } = props;
  const dispatch = useAppDispatch();
  const [deletingWordIds, setDeletingWordIds] = useState<string[]>([]);
  const [editingWord, setEditingWord] = useState<WordResponse | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const categories = useAppSelector(selectCategories);

  const handleDeleteWord = (wordId: string) => {
    setDeletingWordIds((prev) => [...prev, wordId]);

    dispatch(deleteWord(wordId))
      .then((result) => {
        if (deleteWord.fulfilled.match(result)) {
          showSuccess('Word deleted successfully');
        }
      })
      .finally(() => {
        setDeletingWordIds((prev) => prev.filter((id) => id !== wordId));
      });
  };

  const handleEditWord = (data: EditWordFormData) => {
    if (!editingWord) return;

    setIsSubmitting(true);

    dispatch(
      editWord({
        wordId: editingWord._id,
        wordData: {
          en: data.en,
          ua: data.ua,
          category: data.category as WordCategory,
          isIrregular: data.isIrregular,
        },
      })
    )
      .then((result) => {
        if (editWord.fulfilled.match(result)) {
          showSuccess('Word successfully updated');
          setEditingWord(null);
          dispatch(fetchWords());
        }
      })
      .finally(() => {
        setIsSubmitting(false);
      });
  };

  const columns = [
    columnHelper.accessor('en', {
      header: () => (
        <div className="flex items-center justify-between">
          <span>Word</span>
          <Icon
            id="#flag-united-kingdom"
            className="h-8 w-8"
            aria-hidden="true"
          />
        </div>
      ),
      cell: (info) => (
        <div className="truncate" title={info.getValue()}>
          {info.getValue()}
        </div>
      ),
    }),
    columnHelper.accessor('ua', {
      header: () => (
        <div className="flex items-center justify-between">
          <span>Translation</span>
          <Icon id="#flag-ukraine" className="h-8 w-8" aria-hidden="true" />
        </div>
      ),
      cell: (info) => (
        <div className="truncate" title={info.getValue()}>
          {info.getValue()}
        </div>
      ),
    }),
    columnHelper.accessor('category', {
      header: 'Category',
      cell: (info) => (
        <div className="truncate capitalize" title={info.getValue()}>
          {info.getValue()}
        </div>
      ),
    }),
    ...(variant === 'dictionary'
      ? [
          columnHelper.accessor('progress', {
            header: 'Progress',
            cell: ({ getValue }) => {
              const value = getValue();
              return (
                <div className="flex items-center">
                  <div className="w-[48px] text-left">
                    <span>{value}%</span>
                  </div>
                  <div className="mb-1 ml-1.5">
                    <ProgressCircle value={value} />
                  </div>
                </div>
              );
            },
          }),
        ]
      : []),
    columnHelper.accessor('_id', {
      header: '',
      cell: ({ row }) => {
        const { _id: id } = row.original;
        if (variant === 'dictionary') {
          const isDeleting = deletingWordIds.includes(id);

          return (
            <div className="flex justify-center">
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="ghost"
                    className="font-secondary text-[22px] font-semibold px-1 h-10 w-10"
                  >
                    ...
                  </Button>
                </PopoverTrigger>
                <PopoverContent
                  className="w-auto px-6 py-3 bg-background-white"
                  align="end"
                >
                  <div className="flex flex-col gap-2">
                    <Button
                      variant="ghost"
                      className="flex justify-start items-center p-1 w-full"
                      onClick={() => setEditingWord(row.original)}
                    >
                      <Icon
                        id="#edit"
                        className="mb-1 h-5 w-5 stroke-text-primary fill-none mr-2"
                        aria-hidden="true"
                      />
                      <span>Edit</span>
                    </Button>
                    <Button
                      variant="ghost"
                      className="flex justify-start items-center p-1 w-full text-text-error hover:text-text-error"
                      onClick={() => handleDeleteWord(id)}
                      disabled={isDeleting}
                    >
                      {isDeleting ? (
                        <Loader2 className="h-5 w-5 animate-spin mr-2" />
                      ) : (
                        <Icon
                          id="#delete"
                          className="mb-1 h-5 w-5 stroke-current fill-none mr-2"
                          aria-hidden="true"
                        />
                      )}
                      <span>Delete</span>
                    </Button>
                  </div>
                </PopoverContent>
              </Popover>
            </div>
          );
        }

        const isAdding =
          variant === 'recommend' && props.addingWordIds?.includes(id);

        return (
          <Button
            variant="ghost"
            className="flex items-center gap-2 font-primary text-base font-medium text-text-primary transition-colors duration-200 hover:text-brand-primary h-10 group"
            onClick={() => variant === 'recommend' && props.onWordAdd(id)}
            disabled={isAdding}
          >
            <span className="truncate">Add to dictionary</span>
            {isAdding ? (
              <Loader2 className="h-5 w-5 animate-spin shrink-0" />
            ) : (
              <Icon
                id="#arrow-right"
                className="h-5 w-5 stroke-brand-primary fill-none shrink-0 transition-transform duration-200 group-hover:translate-x-0.5"
                aria-hidden="true"
              />
            )}
          </Button>
        );
      },
    }),
  ];

  const table = useReactTable({
    data: words,
    columns,
    getCoreRowModel: getCoreRowModel(),
  });

  const TableWrapper = ({ children }: { children: React.ReactNode }) => (
    <div className="rounded-[15px] bg-background-white p-[18px] min-h-[612px]">
      <div className="w-full overflow-x-auto">
        <table className="w-full min-w-[800px] border-separate border-spacing-0">
          {children}
        </table>
      </div>
    </div>
  );

  if (isLoading) {
    return (
      <TableWrapper>
        <thead>
          {table.getHeaderGroups().map((headerGroup) => (
            <tr key={headerGroup.id}>
              {headerGroup.headers.map((header, index) => (
                <th
                  key={header.id}
                  className={cn(
                    baseCellStyles,
                    tableBorderStyles,
                    'bg-table-row text-left font-primary text-xl font-medium',
                    columnWidths[variant][
                      header.id.split(
                        '_'
                      )[0] as keyof (typeof columnWidths)[typeof variant]
                    ],
                    index === 0 && 'rounded-tl-lg',
                    index === headerGroup.headers.length - 1 && 'rounded-tr-lg',
                    index !== 0 && 'border-l border-table-border'
                  )}
                >
                  {flexRender(
                    header.column.columnDef.header,
                    header.getContext()
                  )}
                </th>
              ))}
            </tr>
          ))}
        </thead>
        <tbody>
          {Array.from({ length: WORDS_PER_PAGE }).map((_, rowIndex) => (
            <tr key={rowIndex} className="">
              {Array.from({ length: columns.length }).map((_, colIndex) => (
                <td
                  key={colIndex}
                  className={cn(
                    baseCellStyles,
                    tableBorderStyles,
                    'bg-table-cell py-[24px]',
                    columnWidths[variant][
                      Object.keys(columnWidths[variant])[
                        colIndex
                      ] as keyof (typeof columnWidths)[typeof variant]
                    ],
                    colIndex !== 0 && 'border-l border-table-border',
                    colIndex === 0 && rowIndex === 2 && 'rounded-bl-lg',
                    colIndex === columns.length - 1 &&
                      rowIndex === 2 &&
                      'rounded-br-lg'
                  )}
                >
                  <div className="h-6 bg-background-skeleton rounded-2xl animate-pulse" />
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </TableWrapper>
    );
  }

  if (words.length === 0) {
    return (
      <div className="flex justify-center items-center h-[400px] rounded-[15px] bg-background-white">
        <p className="font-primary text-lg text-text-secondary">
          No words found
        </p>
      </div>
    );
  }

  return (
    <>
      <TableWrapper>
        <thead>
          {table.getHeaderGroups().map((headerGroup) => (
            <tr key={headerGroup.id}>
              {headerGroup.headers.map((header, index) => (
                <th
                  key={header.id}
                  className={cn(
                    baseCellStyles,
                    tableBorderStyles,
                    'bg-table-row text-left font-primary text-xl font-medium',
                    columnWidths[variant][
                      header.id.split(
                        '_'
                      )[0] as keyof (typeof columnWidths)[typeof variant]
                    ],
                    index === 0 && 'rounded-tl-lg',
                    index === headerGroup.headers.length - 1 && 'rounded-tr-lg',
                    index !== 0 && 'border-l border-table-border'
                  )}
                >
                  {flexRender(
                    header.column.columnDef.header,
                    header.getContext()
                  )}
                </th>
              ))}
            </tr>
          ))}
        </thead>
        <tbody>
          {table.getRowModel().rows.map((row) => (
            <tr key={row.id} className="">
              {row.getVisibleCells().map((cell, index) => (
                <td
                  key={cell.id}
                  className={cn(
                    baseCellStyles,
                    tableBorderStyles,
                    'bg-table-cell',
                    columnWidths[variant][
                      Object.keys(columnWidths[variant])[
                        index
                      ] as keyof (typeof columnWidths)[typeof variant]
                    ],
                    index !== 0 && 'border-l border-table-border',
                    index === 0 &&
                      row.index === table.getRowModel().rows.length - 1 &&
                      'rounded-bl-lg',
                    index === row.getVisibleCells().length - 1 &&
                      row.index === table.getRowModel().rows.length - 1 &&
                      'rounded-br-lg'
                  )}
                >
                  {flexRender(cell.column.columnDef.cell, cell.getContext())}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </TableWrapper>

      {editingWord && (
        <EditWordModal
          word={editingWord}
          categories={categories}
          isOpen={!!editingWord}
          onClose={() => setEditingWord(null)}
          onSubmit={handleEditWord}
          isSubmitting={isSubmitting}
        />
      )}
    </>
  );
}
