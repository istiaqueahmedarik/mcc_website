import ShowBatches from "@/components/batches/showBatches";

const BatchesLayout = ({ children }) => {
  return (
    <div className="w-full flex max-md:flex-col justify-center">
      <ShowBatches />
      {children}
    </div>
  );
};

export default BatchesLayout;
