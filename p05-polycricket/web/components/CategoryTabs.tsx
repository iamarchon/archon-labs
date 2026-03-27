'use client';

const TABS = ['TRENDING', 'TODAY', 'TOURNAMENT'];

export default function CategoryTabs({
  active,
  onChange,
}: {
  active: string;
  onChange: (t: string) => void;
}) {
  return (
    <div className="flex gap-8 border-b border-gray-100 mb-0">
      {TABS.map(t => (
        <button
          key={t}
          onClick={() => onChange(t)}
          className={`text-[10px] tracking-widest uppercase pb-3 transition-colors ${
            active === t
              ? 'text-black border-b-2 border-black -mb-px'
              : 'text-gray-400 hover:text-black'
          }`}
        >
          {t}
        </button>
      ))}
    </div>
  );
}
