'use client'
import { useEffect, useState } from 'react'
type Option = { id:string,label:string,text:string }
type Question = { id:string,text:string,type:string,imageUrl:string|null,topic?:string,options:Option[] }
type Answer = { questionId:string,optionId:string|null,flagged:boolean }

export default function Examination({ params }: { params:{ examId:string } }) {
  const [loaded,setLoaded]=useState(false),[questions,setQuestions]=useState<Question[]>([]),[answers,setAnswers]=useState<Record<string,Answer>>({}),[index,setIndex]=useState(0),[deadline,setDeadline]=useState<number>(0),[seconds,setSeconds]=useState(0),[submitted,setSubmitted]=useState(false),[error,setError]=useState('')

  async function load() {
    const r=await fetch('/api/student/exams/'+params.examId); const j=await r.json()
    if(!r.ok)return setError(j.error||'Examination unavailable')
    if(j.submitted){setSubmitted(true);setLoaded(true);return}
    if(j.session){setDeadline(new Date(j.session.deadlineAt).getTime())}
    if (j.questions) {
      setQuestions(j.questions)
      const answerMap: Record<string, Answer> = {}
      for (const answer of j.answers as Answer[]) answerMap[answer.questionId] = answer
      setAnswers(answerMap)
    }
    setLoaded(true)
  }
  useEffect(()=>{load()},[])
  useEffect(()=>{if(!deadline)return;const i=setInterval(()=>{const s=Math.max(0,Math.ceil((deadline-Date.now())/1000));setSeconds(s);if(s===300)alert('Five minutes remain.');if(s===60)alert('One minute remains.');if(s===0)submit(true)},1000);return()=>clearInterval(i)},[deadline])
  async function start() {
    setError('')
    const r=await fetch('/api/student/exams/'+params.examId,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({action:'start'})});const j=await r.json()
    if(!r.ok)return setError(j.error||'Could not start')
    if(j.deadlineAt)setDeadline(new Date(j.deadlineAt).getTime())
    await load()
  }
  async function save(q:Question,optionId:string|null,flagged:boolean) {
    setAnswers({...answers,[q.id]:{questionId:q.id,optionId,flagged}})
    await fetch('/api/student/exams/'+params.examId,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({action:'save',questionId:q.id,optionId,flagged})})
  }
  async function submit(auto=false) {
    if(!auto&&!confirm('Submit this examination now? You cannot change answers after submission.'))return
    const r=await fetch('/api/student/exams/'+params.examId,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({action:'submit'})})
    if(r.ok)setSubmitted(true);else setError((await r.json()).error)
  }
  useEffect(()=>{const h=()=>fetch('/api/student/exams/'+params.examId,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({action:'visibility'})}).catch(()=>{});document.addEventListener('visibilitychange',h);return()=>document.removeEventListener('visibilitychange',h)},[])

  if(!loaded)return <main><p className="mut">Loading examination…</p></main>
  if(submitted)return <main><h1>Examination submitted</h1><p className="mut">Your answers are saved and will be marked by the server.</p></main>
  if(!questions.length)return <main><h1>Examination instructions</h1>{error&&<p className="err">{error}</p>}<p className="mut">You must enter the examination within its scheduled start and end time. Your server-controlled timer begins when you start.</p><button onClick={start}>START EXAMINATION</button></main>
  const q=questions[index],a=answers[q.id]
  const mm=Math.floor(seconds/60),ss=seconds%60
  return <div className="exam"><header className="exam-head"><div><b>INTER-CLASS ACADEMIC CHAMPIONSHIP</b><div className="mut">Student examination · Question {index+1} of {questions.length}</div></div><div className={`timer ${seconds<300?'err':''}`}>{mm}:{String(ss).padStart(2,'0')}</div></header>{error&&<p className="err">{error}</p>}
    <div className="exam-grid"><section className="question"><div className="eyebrow">QUESTION {index+1}</div><h2>{q.text}</h2>{q.imageUrl&&<img src={q.imageUrl} alt="Question diagram" style={{maxWidth:'100%'}}/>}{q.options.map(o=><button key={o.id} className={`option ${a?.optionId===o.id?'selected':''}`} onClick={()=>save(q,o.id,a?.flagged||false)}><b>{o.label}.</b> {o.text}</button>)}</section>
      <aside><b>Question navigator</b><div className="navgrid" style={{marginTop:10}}>{questions.map((item,i)=><button key={item.id} className={`qnum ${answers[item.id]?.optionId?'answered':''} ${answers[item.id]?.flagged?'flagged':''} ${i===index?'current':''}`} onClick={()=>setIndex(i)}>{i+1}</button>)}</div>
        <div className="row" style={{marginTop:18}}><button className="sec" disabled={index===0} onClick={()=>setIndex(index-1)}>Previous</button><button className="sec" disabled={index===questions.length-1} onClick={()=>setIndex(index+1)}>Next</button></div>
        <button className={a?.flagged?'':'sec'} onClick={()=>save(q,a?.optionId||null,!a?.flagged)}>{a?.flagged?'Remove flag':'Flag question'}</button><button style={{marginTop:10,width:'100%'}} onClick={()=>submit(false)}>Submit examination</button></aside></div>
  </div>
}
