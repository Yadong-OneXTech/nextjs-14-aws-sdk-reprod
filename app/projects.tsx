import { fetchDynamoDbProjectBySlug } from "./actions"

export default async function Page(props: any) {
    const { data, error } = await fetchDynamoDbProjectBySlug('foo')

    return <div>Project</div>
}
