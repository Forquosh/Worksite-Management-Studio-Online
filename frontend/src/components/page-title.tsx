export default function PageTitle({ children }: { children: string }) {
  return (
    <div className='flex items-center justify-between py-3.5'>
      <h1 className='mr-4 text-nowrap text-3xl font-bold'>{children}</h1>
      <hr className='w-11/12' />
    </div>
  )
}
