/** Indian food-labelling style indicator: green square with dot (veg) or brown triangle (non-veg). */
export default function VegMark({ veg = true, className = '' }) {
  return (
    <span
      title={veg ? 'Vegetarian' : 'Non-vegetarian'}
      aria-label={veg ? 'Vegetarian' : 'Non-vegetarian'}
      className={`inline-flex h-4 w-4 shrink-0 items-center justify-center rounded-[3px] border-2 bg-white ${veg ? 'border-green-700' : 'border-amber-800'} ${className}`}
    >
      {veg ? <span className="h-2 w-2 rounded-full bg-green-700" /> : <span className="h-0 w-0 border-x-[4px] border-b-[7px] border-x-transparent border-b-amber-800" />}
    </span>
  );
}
