import Image from "next/image";

const Loader = () => {
  return (
    <div className="min-h-screen flex justify-center items-center">
      <Image
        src="/Loader.gif"
        alt="loading"
        width={100}
        height={100}
        unoptimized
      />
    </div>
  );
};

export default Loader;
