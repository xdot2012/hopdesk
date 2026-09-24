import AppLoading from '~/components/AppLoading';

export default function SectionLoading() {
  return (
    <div className="flex min-h-[8rem] items-center justify-center rounded-lg border border-dashed border-border">
      <AppLoading />
    </div>
  );
}
