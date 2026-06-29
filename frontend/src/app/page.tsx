import { createClient } from '@/utils/supabase/server'

export default async function Page() {
  const supabase = await createClient()

  const { data: admin_boundaries } = await supabase.from('admin_boundaries').select('id, name, country').limit(5)

  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold mb-4">Supabase Connection Test</h1>
      
      <h2 className="text-xl font-semibold mt-6 mb-2">Admin Boundaries</h2>
      {admin_boundaries && admin_boundaries.length > 0 ? (
        <ul className="list-disc pl-5">
          {admin_boundaries.map((boundary) => (
            <li key={boundary.id}>
              {boundary.name} ({boundary.country})
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-gray-500">No boundaries found or table is empty.</p>
      )}
    </div>
  )
}
