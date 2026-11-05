import { useSearchParams } from 'react-router-dom';
import { useFetch } from '../../useFetch';

// Picks the order from ?order=ID, otherwise the customer's most recent active order (or latest).
export function useTrackedOrder() {
  const [params] = useSearchParams();
  const wanted = params.get('order');
  const list = useFetch(wanted ? null : '/orders/mine');
  const id = wanted || (list.data && ((list.data.find((o) => !['Delivered', 'Cancelled'].includes(o.status)) || list.data[0])?.id));
  return { id, listLoading: !wanted && list.loading, listError: list.error, empty: !wanted && list.data && list.data.length === 0 };
}
