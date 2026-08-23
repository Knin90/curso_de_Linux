/* Registro explícito de exámenes finales por nivel — mismo patrón de
   import explícito + mapa que `contentRegistry.js` (sin import.meta.glob).
   Se completa de forma incremental: cada `exam.js` se añade aquí a medida
   que se autora su contenido (ver design/tasks de examen-final-nivel). */

import exam0 from './level-0/exam.js'
import exam1 from './level-1/exam.js'
import exam2 from './level-2/exam.js'
import exam3 from './level-3/exam.js'
import exam4 from './level-4/exam.js'
import exam5 from './level-5/exam.js'
import exam6 from './level-6/exam.js'
import exam7 from './level-7/exam.js'
import exam8 from './level-8/exam.js'
import exam9 from './level-9/exam.js'
import exam10 from './level-10/exam.js'
import exam11 from './level-11/exam.js'
import exam12 from './level-12/exam.js'
import exam13 from './level-13/exam.js'
import exam14 from './level-14/exam.js'
import exam15 from './level-15/exam.js'
import exam16 from './level-16/exam.js'
import exam17 from './level-17/exam.js'
import exam18 from './level-18/exam.js'
import exam19 from './level-19/exam.js'
import exam20 from './level-20/exam.js'
import exam21 from './level-21/exam.js'
import exam22 from './level-22/exam.js'
import exam23 from './level-23/exam.js'
import exam24 from './level-24/exam.js'
import exam25 from './level-25/exam.js'
import exam26 from './level-26/exam.js'
import exam27 from './level-27/exam.js'
import exam28 from './level-28/exam.js'
import exam29 from './level-29/exam.js'
import exam30 from './level-30/exam.js'
import exam31 from './level-31/exam.js'
import exam32 from './level-32/exam.js'
import exam33 from './level-33/exam.js'
import exam34 from './level-34/exam.js'
import exam35 from './level-35/exam.js'
import exam36 from './level-36/exam.js'
import exam37 from './level-37/exam.js'
import exam38 from './level-38/exam.js'
import exam39 from './level-39/exam.js'

export const examRegistry = {
  0: exam0,
  1: exam1,
  2: exam2,
  3: exam3,
  4: exam4,
  5: exam5,
  6: exam6,
  7: exam7,
  8: exam8,
  9: exam9,
  10: exam10,
  11: exam11,
  12: exam12,
  13: exam13,
  14: exam14,
  15: exam15,
  16: exam16,
  17: exam17,
  18: exam18,
  19: exam19,
  20: exam20,
  21: exam21,
  22: exam22,
  23: exam23,
  24: exam24,
  25: exam25,
  26: exam26,
  27: exam27,
  28: exam28,
  29: exam29,
  30: exam30,
  31: exam31,
  32: exam32,
  33: exam33,
  34: exam34,
  35: exam35,
  36: exam36,
  37: exam37,
  38: exam38,
  39: exam39,
}

export function getExam(levelId) {
  return examRegistry[levelId]
}
