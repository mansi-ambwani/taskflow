import { useCallback, useEffect, useRef, useState } from 'react';
import { api } from '../api/client.js';

// Loads a page of tasks for the given filters and exposes a reload function.
export default function useTasks(params) {
  const [tasks, setTasks] = useState([]);
  const [meta, setMeta] = useState({ page: 1, totalPages: 1, total: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const requestId = useRef(0);
  const key = JSON.stringify(params);

  const load = useCallback(async () => {
    const id = ++requestId.current; // ignore out-of-order responses
    setLoading(true);
    setError('');
    try {
      const res = await api.listTasks(JSON.parse(key));
      if (id !== requestId.current) return;
      setTasks(res.data);
      setMeta(res.meta);
    } catch (err) {
      if (id === requestId.current) setError(err.message);
    } finally {
      if (id === requestId.current) setLoading(false);
    }
  }, [key]);

  useEffect(() => {
    load();
  }, [load]);

  return { tasks, meta, loading, error, reload: load };
}
