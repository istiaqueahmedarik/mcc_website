import LiveReportTable from '@/components/LiveReportTable';
import { post, post_with_token } from '@/lib/action';
import React from 'react'

async function page({ params }) {
    const paramBox = await params;
    const { id } = paramBox;
  const data = await post('public-contest-report/get', { report_id: id })
  console.log(data);
    if (data.error || (data?.success && data.result.length === 0)) 
        return <div>Report not found</div>
  let res = data.result[0].JSON_string;
  const lastUpdated = data.result[0].Updated_at;
  const lastUpdatedDate = new Date(lastUpdated).toLocaleString();
    const merged = JSON.parse(res);
    return (
      <div className="w-full overflow-hidden border rounded-lg">
        <LiveReportTable merged={merged} lastUpdated={lastUpdatedDate} />
      </div>
    )
}

export default page