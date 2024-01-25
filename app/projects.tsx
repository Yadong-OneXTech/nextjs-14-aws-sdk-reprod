import { fetchDynamoDbProjectBySlug, fetchDynamoDb, fetchProjectBySlug, fetchProjectRentalTransactions, fetchProjectSalesTransactions, fetchS3SignedUrl, getUser } from "./actions"

export default async function Page(props: any) {
    const { data, error } = await fetchDynamoDbProjectBySlug('foo')
    const x = await fetchDynamoDb('ScanFilter' as any)
    const y = await fetchProjectBySlug('foo')
    const z = await fetchProjectRentalTransactions({ projectTitle: 'foo' })
    const r = await fetchProjectSalesTransactions({ projectTitle: 'foo', salesInterval: 'month' })
    const s = await fetchS3SignedUrl({ Bucket: 'public' })
    const t = await getUser()

    return <div>Project</div>
}
