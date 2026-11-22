import { z } from 'zod'
import { db } from '@/lib/db'
import { audit } from '@/lib/audit'
import { handle, requireRole } from '@/lib/auth'

const body=z.object({title:z.string().trim().min(3).max(160),classId:z.string().min(1),durationMin:z.number().int().min(1).max(300),startsAt:z.string(),endsAt:z.string(),questionCount:z.number().int().min(1).max(200),negativeMarking:z.boolean().default(false),shuffleQuestions:z.boolean().default(true),shuffleOptions:z.boolean().default(true)})
export const GET=handle(async()=>{await requireRole('ADMIN');return Response.json(await db.examination.findMany({include:{class:true,_count:{select:{questions:true,sessions:true,results:true}},round:true},orderBy:{startsAt:'desc'}}))})
export const POST=handle(async(req)=>{
 const admin=await requireRole('ADMIN');const d=body.parse(await req.json())
 const startsAt=new Date(d.startsAt),endsAt=new Date(d.endsAt)
 if(Number.isNaN(startsAt.getTime())||Number.isNaN(endsAt.getTime())||endsAt<=startsAt)return Response.json({error:'Invalid examination schedule'}, {status:400})
 const pool=await db.question.findMany({where:{classId:d.classId,status:'APPROVED'},select:{id:true}})
 if(pool.length<d.questionCount)return Response.json({error:`Only ${pool.length} approved questions exist for this class. Add more questions.`},{status:400})
 for(let i=pool.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[pool[i],pool[j]]=[pool[j],pool[i]]}
 const exam=await db.examination.create({data:{title:d.title,classId:d.classId,durationMin:d.durationMin,startsAt,endsAt,status:'SCHEDULED',negativeMarking:d.negativeMarking,shuffleQuestions:d.shuffleQuestions,shuffleOptions:d.shuffleOptions,questions:{create:pool.slice(0,d.questionCount).map((q,i)=>({questionId:q.id,orderNo:i+1}))}},include:{class:true}})
 await audit('EXAM_CREATE',{examId:exam.id,title:d.title,classId:d.classId,questionCount:d.questionCount},admin.id)
 return Response.json(exam,{status:201})
})
