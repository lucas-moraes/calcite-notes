const delays = [0.15, 0.3, 0.45, 0.6, 0.75];

export default function Loader() {
  return (
    <div className="flex items-center justify-center h-full">
      <div className="relative w-[33px] h-[33px]" style={{ perspective: "67px" }}>
        {delays.map((d) => (
          <div
            key={d}
            className="absolute left-1/2 w-full h-full bg-accent animate-loader-flip"
            style={{ transformOrigin: "left", animationDelay: `${d}s` }}
          />
        ))}
      </div>
    </div>
  );
}
