import Image from 'next/image'

const Loader = () => {
  return (
    <div className="flex justify-center items-center">
      <Image
        src="/Loader.gif"
        alt="loading"
        width={100}
        height={100}
      />
    </div>
  )
}

export default Loader
