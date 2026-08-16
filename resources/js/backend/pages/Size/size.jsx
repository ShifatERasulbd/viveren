import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';

import { SizeTable } from '@/components/size/table';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { useAppContext } from '@/context/AppContext';

import { deleteSize, fetchSizes, reorderSizes } from './api';

function moveItemById(items, sourceId, targetId) {
  const sourceIndex = items.findIndex((item) => Number(item.id) === Number(sourceId));
  const targetIndex = items.findIndex((item) => Number(item.id) === Number(targetId));

  if (sourceIndex < 0 || targetIndex < 0 || sourceIndex === targetIndex) {
    return items;
  }

  const next = [...items];
  const [moved] = next.splice(sourceIndex, 1);
  next.splice(targetIndex, 0, moved);
  return next;
}

export default function Size() {
  const navigate = useNavigate();
  const { setPageTitle } = useAppContext();
  const [sizes, setSizes] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState('');
  const [deletingId, setDeletingId] = useState(null);
  const [sizeToDelete, setSizeToDelete] = useState(null);
  const [isReordering, setIsReordering] = useState(false);

    useEffect(() => {
    setPageTitle('Size');
    }, [setPageTitle]);

  useEffect(() => {
    let ignore = false;

    async function loadSizes() {
      setIsLoading(true);
      setErrorMessage('');

      try {
        const data = await fetchSizes();
        if (!ignore) {
          setSizes(Array.isArray(data) ? data : []);
        }
      } catch (error) {
        if (!ignore) {
          setErrorMessage(error.message || 'Failed to load Sizes.');
        }
      } finally {
        if (!ignore) {
          setIsLoading(false);
        }
      }
    }

    loadSizes();

    return () => {
      ignore = true;
    };
  }, []);

  const handleConfirmDelete = async () => {
    if (!sizeToDelete) {
      return;
    }

    const id = sizeToDelete.id;

    setDeletingId(id);
    setErrorMessage('');

    try {
      await deleteSize(id);
      setSizes((previous) => (Array.isArray(previous) ? previous : []).filter((size) => size.id !== id));
      toast.success('Size deleted successfully.', {
        style: { color: '#16a34a' },
      });
      setSizeToDelete(null);
    } catch (error) {
      const message = error.message || 'Failed to delete Size.';
      setErrorMessage(message);
      toast.error(message, {
        style: { color: '#dc2626' },
      });
    } finally {
      setDeletingId(null);
    }
  };

  const handleReorder = async (sourceId, targetId) => {
    if (isReordering || sourceId === targetId) {
      return;
    }

    const previous = sizes;
    const reordered = moveItemById(previous, sourceId, targetId);
    if (reordered === previous) {
      return;
    }

    setSizes(reordered);
    setIsReordering(true);
    setErrorMessage('');

    try {
      const payload = await reorderSizes(reordered.map((size) => Number(size.id)));
      if (Array.isArray(payload)) {
        setSizes(payload);
      }
      toast.success('Size order updated.', {
        style: { color: '#16a34a' },
      });
    } catch (error) {
      setSizes(previous);
      const message = error.message || 'Failed to reorder Sizes.';
      setErrorMessage(message);
      toast.error(message, {
        style: { color: '#dc2626' },
      });
    } finally {
      setIsReordering(false);
    }
  };

    return (
    <div className="space-y-5">
      {errorMessage && <p className="text-sm text-destructive">{errorMessage}</p>}

            <div className="grid grid-cols-1 gap-4 lg:grid-cols-1">
                <SizeTable
                sizes={sizes}
              onAdd={() => navigate('/admin/size/add')}
              onEdit={(id) => navigate(`/admin/size/${id}/edit`)}
                onRequestDelete={setSizeToDelete}
                onReorder={handleReorder}
                deletingId={deletingId}
                isReordering={isReordering}
                isLoading={isLoading}
                />
                    </div>

            <AlertDialog open={Boolean(sizeToDelete)} onOpenChange={(open) => !open && setSizeToDelete(null)}>
                <AlertDialogContent>
                <AlertDialogHeader>
                    <AlertDialogTitle>Delete Size</AlertDialogTitle>
                    <AlertDialogDescription>
                    Are you sure you want to delete {sizeToDelete?.size}? This action cannot be undone.
                    </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                    <AlertDialogCancel disabled={deletingId !== null}>Cancel</AlertDialogCancel>
                    <AlertDialogAction
                    variant="destructive"
                    disabled={deletingId !== null}
                    onClick={handleConfirmDelete}
                    >
                    {deletingId !== null ? 'Deleting...' : 'Delete'}
                    </AlertDialogAction>
                </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>

    </div>
    );
}