from django.db import migrations, models


def backfill_account_status(apps, schema_editor):
    User = apps.get_model('users', 'User')
    User.objects.filter(is_active=True).update(account_status='ACTIVE')
    User.objects.filter(is_active=False).update(account_status='PENDING_VERIFICATION')


class Migration(migrations.Migration):

    dependencies = [
        ('users', '0001_initial'),
    ]

    operations = [
        migrations.AddField(
            model_name='user',
            name='account_status',
            field=models.CharField(
                choices=[
                    ('ACTIVE', 'Active'),
                    ('PENDING_VERIFICATION', 'Pending Verification'),
                    ('RESTRICTED', 'Restricted'),
                    ('SUSPENDED', 'Suspended'),
                    ('DELETED', 'Deleted'),
                ],
                default='PENDING_VERIFICATION',
                max_length=30,
            ),
        ),
        migrations.RunPython(backfill_account_status, migrations.RunPython.noop),
    ]
