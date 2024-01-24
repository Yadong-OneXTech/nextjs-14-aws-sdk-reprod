'use server'

import type { GetObjectCommandInput } from '@aws-sdk/client-s3'
import type { ScanCommandInput } from '@aws-sdk/lib-dynamodb'

import { DynamoDB } from '@aws-sdk/client-dynamodb'
import { Lambda } from '@aws-sdk/client-lambda'
import { GetObjectCommand, S3 } from '@aws-sdk/client-s3'
import { DynamoDBDocument } from '@aws-sdk/lib-dynamodb'
import { getSignedUrl } from '@aws-sdk/s3-request-presigner'
import { createServerComponentClient } from '@supabase/auth-helpers-nextjs'
import { revalidatePath } from 'next/cache'
import { cookies } from 'next/headers'

const {
  AWS_AMPLIFY_ENV,
  aws_project_region,
  aws_user_files_s3_bucket,
  NEXT_PUBLIC_AWS_LAMBDA_ACCESS_KEY,
  NEXT_PUBLIC_AWS_LAMBDA_SECRET_KEY,
} = process.env as Record<string, string>

const lambda = new Lambda({
  credentials: {
    accessKeyId: NEXT_PUBLIC_AWS_LAMBDA_ACCESS_KEY ?? '',
    secretAccessKey: NEXT_PUBLIC_AWS_LAMBDA_SECRET_KEY ?? '',
  },

  region: aws_project_region ?? '',
})
const dynamoDocClient = DynamoDBDocument.from(new DynamoDB())
const s3 = new S3({
  credentials: {
    accessKeyId: NEXT_PUBLIC_AWS_LAMBDA_ACCESS_KEY ?? '',
    secretAccessKey: NEXT_PUBLIC_AWS_LAMBDA_SECRET_KEY ?? '',
  },

  region: aws_project_region ?? '',
})

export async function revalidatePathAction(
  path: string,
  type?: 'layout' | 'page' | undefined,
): Promise<void> {
  revalidatePath(path, type)
}

export async function getUser() {
  const supabaseClient = createServerComponentClient({ cookies })
  const { data: userData } = await supabaseClient.auth.getUser()
  const { data: user } = await supabaseClient
    .from('user')
    .select('*')
    .eq('email', userData?.user?.email)
    .single()
  const { data: person } = await supabaseClient
    .from('person')
    .select('*')
    .eq('email', userData?.user?.email)
    .single()
  const { data: agentProfile } = await supabaseClient
    .from('agent_profile')
    .select('*')
    .eq('email', userData?.user?.email)
    .single()
  return { agentProfile, authUser: userData?.user, dbUser: user, person }
}

// =====================================================================
// AWS Lambda
// =====================================================================
interface InvokeLambdaArgs {
  apiName: string
  httpMethod?: string
  path: string
  payload?: any
}

export async function invokeLambda(args: InvokeLambdaArgs): Promise<{
  data?: any
  error?: any
}> {
  try {
    const { apiName, httpMethod = 'GET', path, payload } = args

    const params = {
      FunctionName: `${apiName}-${AWS_AMPLIFY_ENV}`,
      InvocationType: 'RequestResponse',
      Payload: JSON.stringify({
        ...payload,
        httpMethod,
        path,
      }),
    }
    // @ts-ignore
    const { Payload } = await lambda.invoke(params)
    const response = Payload ? JSON.parse(Payload.toString()) : {}
    const { data } = JSON.parse(response.body)

    return { data }
  } catch (error) {
    console.error(error)
    return { error }
  }
}

export async function fetchProjectBySlug(projectSlug: string) {
  if (!projectSlug) return { data: null }

  const { data, error } = await invokeLambda({
    apiName: 'projects',
    path: `/projects/${projectSlug}`,
  })

  return { data: data, error }
}

export interface FetchSalesDataArgs {
  projectTitle: string
  salesInterval: string
}

export async function fetchProjectSalesTransactions({
  projectTitle,
  salesInterval,
}: FetchSalesDataArgs) {
  if (!projectTitle) return { data: [] }

  const { data, error } = await invokeLambda({
    apiName: 'transactions',
    path: `/transactions`,
    payload: {
      queryStringParameters: {
        interval: salesInterval,
      },
    },
  })

  return { data, error }
}

export interface FetchRentalDataArgs {
  projectTitle: string
}

export async function fetchProjectRentalTransactions({
  projectTitle,
}: FetchRentalDataArgs) {
  if (!projectTitle) return { data: [] }

  const { data, error } = await invokeLambda({
    apiName: 'transactions',
    path: `/transactions`,
  })

  return { data, error }
}

// =====================================================================
// DynamoDB
// =====================================================================
interface FetchDynamoDbOptions {
  isFetchAll?: boolean
  skip?: boolean
}
export const fetchDynamoDb = async (
  scanParams: ScanCommandInput,
  options?: FetchDynamoDbOptions,
  prevData?: Array<Record<string, any>> | undefined,
): Promise<any> => {
  try {
    const defaultParams = { Limit: 1000 }
    const params = { ...defaultParams, ...scanParams }
    const { isFetchAll, skip } = options || {}

    if (skip) return []

    const onScan = await dynamoDocClient.scan(params)
    const { Items, LastEvaluatedKey } = onScan || {}
    const nextData = (prevData || []).concat(Items || [])

    if (isFetchAll && LastEvaluatedKey) {
      const nextParams = {
        ...params,
        ExclusiveStartKey: LastEvaluatedKey,
      }
      return fetchDynamoDb(nextParams, options, nextData)
    }

    return nextData
  } catch {
    return prevData || []
  }
}

export const fetchDynamoDbProjectBySlug = async (projectSlug: string) => {
  try {
    const projects = await fetchDynamoDb(
      {
        ExpressionAttributeValues: { ':project_slug': projectSlug },
        FilterExpression: 'slug = :project_slug',
        TableName: 'project_table',
      },
      { isFetchAll: true, skip: !projectSlug },
    )
    return { data: projects?.[0] ?? null }
  } catch (error) {
    return { error }
  }
}

// =====================================================================
// S3
// =====================================================================
export const fetchS3SignedUrl = async (
  params: Partial<GetObjectCommandInput>,
) => {
  try {
    const nextParams = {
      ...params,
      Bucket: params?.Bucket || aws_user_files_s3_bucket,
    } as GetObjectCommandInput
    const signedUrl = await getSignedUrl(s3, new GetObjectCommand(nextParams))
    return { data: signedUrl }
  } catch (error) {
    return { error }
  }
}
