import type { TranslationSchema } from '../../types';
import auth from './auth';
import common from './common';
import community from './community';
import discovery from './discovery';
import explore from './explore';
import languages from './languages';
import map from './map';
import planning from './planning';
import profile from './profile';
import share from './share';
import tripForm from './tripForm';
import trips from './trips';

const en: TranslationSchema = {
  common,
  languages,
  auth,
  tripForm,
  explore,
  map,
  trips,
  planning,
  community,
  profile,
  discovery,
  share,
};

export default en;
