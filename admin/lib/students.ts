import { Student } from '@/types'

const FIRST_NAMES = [
  'Aarav','Aditi','Akash','Amit','Ananya','Anika','Arjun','Aryan',
  'Deepa','Divya','Gaurav','Ishaan','Kabir','Kavya','Kunal','Mansi',
  'Mihir','Neha','Nikhil','Prajwal','Priya','Rahul','Riya','Rohan',
  'Sahil','Sakshi','Sanjay','Shreya','Simran','Sneha','Suresh','Tanvi',
  'Tushar','Varun','Vedant','Vidya','Vikram','Vishal','Yash','Zara'
]

const LAST_NAMES = [
  'Bhosale','Chavan','Deshmukh','Deshpande','Gaikwad','Jadhav',
  'Joshi','Kadam','Kulkarni','Lokhande','Mali','Mane','More',
  'Naik','Patil','Pawar','Salunkhe','Sawant','Shah','Sharma',
  'Shinde','Singh','Suryavanshi','Thorat','Wagh'
]

const AREAS = [
  'Kothrud','Baner','Wakad','Aundh','Hadapsar',
  'Shivajinagar','Viman Nagar','Pimpri','Chinchwad','Magarpatta'
]

const PANELS = ['A','B','C','D','E','F','G','H','I','J','K']

function seededRand(seed: number): () => number {
  let s = seed
  return () => {
    s = (s * 1664525 + 1013904223) & 0xffffffff
    return (s >>> 0) / 0xffffffff
  }
}

export function generateStudents(): Student[] {
  const rand = seededRand(42)
  const students: Student[] = []

  PANELS.forEach((panel) => {
    for (let i = 0; i < 60; i++) {
      const fi = Math.floor(rand() * FIRST_NAMES.length)
      const li = Math.floor(rand() * LAST_NAMES.length)
      const firstName = FIRST_NAMES[fi]
      const lastName = LAST_NAMES[li]
      const num = String(i + 1).padStart(3, '0')
      const roll_no = `TY-CSE-${panel}-${num}`
      const emailSuffix = String(Math.floor(rand() * 90) + 10)
      const email = `${firstName.toLowerCase()}.${lastName.toLowerCase()}${emailSuffix}@mitwpu.edu.in`
      const phonePrefix = Math.floor(rand() * 30) + 70
      const phoneRest = String(Math.floor(rand() * 1e8)).padStart(8, '0')
      const phone = `${phonePrefix}${phoneRest}`
      const area = AREAS[Math.floor(rand() * AREAS.length)]
      const houseNo = Math.floor(rand() * 999) + 1
      const address = `${houseNo}, ${area}, Pune, Maharashtra`
      const aadharRaw = String(Math.floor(rand() * 1e12)).padStart(12, '0')
      const aadhar = `${aadharRaw.slice(0, 4)} ${aadharRaw.slice(4, 8)} ${aadharRaw.slice(8, 12)}`
      const year = 2002 + Math.floor(rand() * 3)
      const month = String(Math.floor(rand() * 12) + 1).padStart(2, '0')
      const day = String(Math.floor(rand() * 28) + 1).padStart(2, '0')
      const dob = `${day}/${month}/${year}`
      const gender: 'Male' | 'Female' = students.length % 2 === 0 ? 'Male' : 'Female'

      // 1. Attendance percentage: ~20% below 80% (Defaulters)
      const isAttDef = i % 5 === 0
      const attendance = isAttDef
        ? Number((58 + rand() * 21).toFixed(1))
        : Number((80 + rand() * 19.5).toFixed(1))

      // 2. CCA1 (max 15), CCA2 (max 15), Midterm (max 30) marks: total out of 60. Aggregate < 24 is defaulter.
      const isMarksDef = i % 6 === 0
      const cca1 = isMarksDef ? Math.floor(rand() * 4) + 2 : Math.floor(rand() * 6) + 10
      const cca2 = isMarksDef ? Math.floor(rand() * 4) + 2 : Math.floor(rand() * 6) + 10
      const midterm = isMarksDef ? Math.floor(rand() * 7) + 5 : Math.floor(rand() * 11) + 20

      // 3. LCA tracking: LCA1 (33), LCA2 (33), LCA3 (34)
      let lca1: number | null = Math.floor(rand() * 14) + 20
      let lca1_days_left = 10
      let lca1_buffer_left = 4
      let lca1_detention_pending = false
      let detained = false

      if (i % 15 === 1) {
        lca1 = null
        lca1_days_left = (i % 8) + 2
        lca1_buffer_left = 4
      } else if (i % 25 === 2) {
        lca1 = null
        lca1_days_left = 0
        lca1_buffer_left = (i % 3) + 1
      } else if (i % 35 === 3) {
        lca1 = 0
        lca1_days_left = 0
        lca1_buffer_left = 0
        lca1_detention_pending = true
      } else if (i % 55 === 4) {
        lca1 = 0
        lca1_days_left = 0
        lca1_buffer_left = 0
        detained = true
      }

      let lca2: number | null = Math.floor(rand() * 14) + 20
      let lca2_days_left = 10
      let lca2_buffer_left = 4
      let lca2_detention_pending = false
      if (i % 18 === 2) {
        lca2 = null
        lca2_days_left = 5
      } else if (i % 32 === 5) {
        lca2 = null
        lca2_days_left = 0
        lca2_buffer_left = 2
      } else if (i % 48 === 7) {
        lca2 = 0
        lca2_days_left = 0
        lca2_buffer_left = 0
      }

      let lca3: number | null = Math.floor(rand() * 15) + 20
      let lca3_days_left = 10
      let lca3_buffer_left = 4
      let lca3_detention_pending = false
      if (i % 22 === 3) {
        lca3 = null
        lca3_days_left = 8
      } else if (i % 38 === 8) {
        lca3 = null
        lca3_days_left = 0
        lca3_buffer_left = 3
      }


      students.push({
        roll_no,
        name: `${firstName} ${lastName}`,
        email,
        phone,
        address,
        aadhar,
        dob,
        gender,
        department: 'CSE',
        panel,
        year: 'TY',
        program: 'BTech',
        attendance,
        cca1,
        cca2,
        midterm,
        lca1,
        lca2,
        lca3,
        detained,
        lca1_days_left,
        lca1_buffer_left,
        lca1_detention_pending,
        lca2_days_left,
        lca2_buffer_left,
        lca2_detention_pending,
        lca3_days_left,
        lca3_buffer_left,
        lca3_detention_pending,
      })
    }
  })

  return students
}

export const STUDENTS: Student[] = generateStudents()
