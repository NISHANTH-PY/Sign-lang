import { DictionaryItem } from '../types';
import { MULTI_LANGUAGE_DICTIONARY } from './signLanguages';

export const ASL_DICTIONARY: DictionaryItem[] = MULTI_LANGUAGE_DICTIONARY.filter(
  (item) => item.signLanguage === 'ASL'
);
