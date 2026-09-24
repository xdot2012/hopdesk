import { ArrowDown, ArrowUp, ArrowUpDown } from 'lucide-react';

type SortIconProps = {
  sorted: false | 'asc' | 'desc';
};

export default function SortIcon({ sorted }: SortIconProps) {
  if (sorted === 'asc') return <ArrowUp className="ml-2 h-3.5 w-3.5" />;
  if (sorted === 'desc') return <ArrowDown className="ml-2 h-3.5 w-3.5" />;
  return <ArrowUpDown className="ml-2 h-3.5 w-3.5 opacity-50" />;
}
