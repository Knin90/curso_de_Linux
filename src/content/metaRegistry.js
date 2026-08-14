/* Registro ligero: solo meta + títulos de módulos por nivel.
   La landing solo necesita esto (búsqueda, tarjetas destacadas, primer nivel).
   Los contenidos markdown (pesados) viven en contentRegistry, que se carga
   bajo demanda con las rutas de nivel (React.lazy). */

import * as level1 from './level-1/index.js'
import * as level2 from './level-2/index.js'
import * as level3 from './level-3/index.js'
import * as level4 from './level-4/index.js'
import * as level5 from './level-5/index.js'
import * as level6 from './level-6/index.js'
import * as level7 from './level-7/index.js'
import * as level8 from './level-8/index.js'
import * as level9 from './level-9/index.js'
import * as level10 from './level-10/index.js'
import * as level11 from './level-11/index.js'
import * as level12 from './level-12/index.js'
import * as level13 from './level-13/index.js'
import * as level14 from './level-14/index.js'
import * as level15 from './level-15/index.js'
import * as level16 from './level-16/index.js'
import * as level17 from './level-17/index.js'
import * as level18 from './level-18/index.js'
import * as level19 from './level-19/index.js'
import * as level20 from './level-20/index.js'
import * as level21 from './level-21/index.js'
import * as level22 from './level-22/index.js'
import * as level23 from './level-23/index.js'
import * as level24 from './level-24/index.js'
import * as level25 from './level-25/index.js'
import * as level26 from './level-26/index.js'
import * as level27 from './level-27/index.js'
import * as level28 from './level-28/index.js'
import * as level29 from './level-29/index.js'
import * as level30 from './level-30/index.js'
import * as level31 from './level-31/index.js'
import * as level32 from './level-32/index.js'
import * as level33 from './level-33/index.js'
import * as level34 from './level-34/index.js'
import * as level35 from './level-35/index.js'
import * as level36 from './level-36/index.js'

export const metaRegistry = {
  1: { meta: level1.meta, modules: level1.modules },
  2: { meta: level2.meta, modules: level2.modules },
  3: { meta: level3.meta, modules: level3.modules },
  4: { meta: level4.meta, modules: level4.modules },
  5: { meta: level5.meta, modules: level5.modules },
  6: { meta: level6.meta, modules: level6.modules },
  7: { meta: level7.meta, modules: level7.modules },
  8: { meta: level8.meta, modules: level8.modules },
  9: { meta: level9.meta, modules: level9.modules },
  10: { meta: level10.meta, modules: level10.modules },
  11: { meta: level11.meta, modules: level11.modules },
  12: { meta: level12.meta, modules: level12.modules },
  13: { meta: level13.meta, modules: level13.modules },
  14: { meta: level14.meta, modules: level14.modules },
  15: { meta: level15.meta, modules: level15.modules },
  16: { meta: level16.meta, modules: level16.modules },
  17: { meta: level17.meta, modules: level17.modules },
  18: { meta: level18.meta, modules: level18.modules },
  19: { meta: level19.meta, modules: level19.modules },
  20: { meta: level20.meta, modules: level20.modules },
  21: { meta: level21.meta, modules: level21.modules },
  22: { meta: level22.meta, modules: level22.modules },
  23: { meta: level23.meta, modules: level23.modules },
  24: { meta: level24.meta, modules: level24.modules },
  25: { meta: level25.meta, modules: level25.modules },
  26: { meta: level26.meta, modules: level26.modules },
  27: { meta: level27.meta, modules: level27.modules },
  28: { meta: level28.meta, modules: level28.modules },
  29: { meta: level29.meta, modules: level29.modules },
  30: { meta: level30.meta, modules: level30.modules },
  31: { meta: level31.meta, modules: level31.modules },
  32: { meta: level32.meta, modules: level32.modules },
  33: { meta: level33.meta, modules: level33.modules },
  34: { meta: level34.meta, modules: level34.modules },
  35: { meta: level35.meta, modules: level35.modules },
  36: { meta: level36.meta, modules: level36.modules },
}
