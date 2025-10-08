"use client";

const MagicButton = ({
  title,
  icon,
  position,
  handleClick,
  otherClasses,
  textClass,
  bgColor = "bg-slate-50 dark:bg-slate-950",
}) => {
  return (
    <button
      onClick={handleClick}
      className="group relative inline-flex h-12 w-full overflow-hidden rounded-lg p-[1px] focus:outline-none md:w-60 md:mt-10 transition-transform duration-300 hover:scale-105 active:scale-95"
    >
      {/* Original Golden Spinning Border - Keep as is */}
      <span className="absolute inset-[-1000%] animate-[spin_2s_linear_infinite] bg-[conic-gradient(from_90deg_at_50%_50%,#E2CBFF_0%,#393BB2_50%,#E2CBFF_100%)]" />

      <span
        className={`relative inline-flex h-full w-full items-center justify-center rounded-lg ${bgColor} px-3 py-1 overflow-hidden`}
      >
        {/* Improved Fill Animation - White in dark mode, Dark in light mode */}
        <span
          className={`absolute inset-0 bg-white dark:bg-slate-900 translate-x-[-100%] transition-transform duration-500 ease-out group-hover:translate-x-0 ${otherClasses}`}
        />

        {/* Text with proper visibility */}
        <span
          className={`relative z-10 flex items-center gap-2 text-slate-950 dark:text-white group-hover:text-slate-950 dark:group-hover:text-white font-medium transition-colors duration-500 ${textClass}`}
        >
          {position === "left" && icon}
          {title}
          {position === "right" && icon}
        </span>
      </span>
    </button>
  );
};

export default MagicButton;
