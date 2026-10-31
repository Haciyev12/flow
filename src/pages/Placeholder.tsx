interface PlaceholderProps {
  title: string;
}

export function Placeholder({ title }: PlaceholderProps) {
  return (
    <div className="flex-1 flex items-center justify-center">
      <div className="text-center">
        <p className="text-[13px] font-medium text-lo">{title}</p>
        <p className="text-[12px] text-dim mt-1">Coming in a future stage.</p>
      </div>
    </div>
  );
}
