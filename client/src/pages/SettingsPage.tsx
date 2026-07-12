import { useConfig } from '../api/hooks';
import { useI18n } from '../i18n/I18nContext';

export function SettingsPage() {
  const { t } = useI18n();
  const config = useConfig();

  return (
    <div className="page">
      <h1 className="page__title">{t('nav_settings')}</h1>
      <section className="panel">
        <h2 className="panel__title">Household</h2>
        {config.isLoading ? (
          <p>{t('loading')}</p>
        ) : (
          <dl className="settings-list">
            <div>
              <dt>Name</dt>
              <dd>{config.data?.householdName}</dd>
            </div>
            <div>
              <dt>Timezone</dt>
              <dd>{config.data?.timezone}</dd>
            </div>
            <div>
              <dt>Week starts on</dt>
              <dd>{config.data?.weekStartsOn}</dd>
            </div>
          </dl>
        )}
      </section>

      <section className="panel">
        <h2 className="panel__title">Install this app</h2>
        <p className="muted">
          On Android (Chrome): open the browser menu and choose “Install app” or
          “Add to Home screen”.
        </p>
        <p className="muted">
          On iPhone (Safari): tap the Share button, then “Add to Home Screen”.
        </p>
      </section>

      <section className="panel">
        <h2 className="panel__title">About</h2>
        <p className="muted">
          Alper Chores — a weekly family chore &amp; meal organizer. Version 1.
        </p>
      </section>
    </div>
  );
}
