
interface TopicItem {
  _id: string;
  slug: string;
  name: string;
}

interface SectionData {
  title: string;
  slug: string;
  type: string;
  data: IMovie[];
  queryKey?: string;
}

interface HomePageProps {
  sliderData: IMovie[];
  fixedSections: SectionData[];
  lazyConfig: SectionData[];
  topics: TopicItem[];
}
