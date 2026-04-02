#!/usr/bin/env python3
"""
Daily Email Summary Script
Checks QQ mail for important emails and sends summary via cron
"""

import imaplib
import email
import json
import os
from datetime import datetime

# QQ mail config
IMAP_SERVER = 'imap.qq.com'
EMAIL = 'lcf33123@foxmail.com'
PASSWORD = 'fdskgzdghethbcbc'

# Known marketing/subscription senders to filter out
MARKETING_SENDERS = [
    'dev.to', 'yo@dev.to', 'newsletter',
    'linkedin.com', 'messages-noreply@linkedin.com',
    'infoq.com', 'infoqchina@edm.infoq.com', 'infoq.geekbang.org',
    'vultr.com', 'marketing@getvultr.com',
    'apple.com', 'developer@insideapple.apple.com',
    'fullstack.io', 'us@fullstack.io',
    'scandit.com', 'support@scandit.com',
    'npmjs.com', 'support@npmjs.com',
    'github.com', 'noreply@github.com',
    'atlassian.com', 'slack.com', 'zoom.com',
    'mailchimp.com', 'sendgrid.net', 'mailgun.org',
]

def is_important_email(sender, subject):
    """Check if email is important (not marketing/spam)"""
    sender_lower = sender.lower()
    subject_lower = subject.lower() if subject else ''
    
    # Check if sender is marketing
    for marketing in MARKETING_SENDERS:
        if marketing in sender_lower:
            return False
    
    # Check for important keywords
    important_keywords = ['银行', '支付', '订单', 'account', 'security', 
                         'password', 'invoice', 'bill', 'payment',
                         'cmbchina', 'tencent.com', 'aliyun', 'aws.amazon']
    
    for keyword in important_keywords:
        if keyword in sender_lower or keyword in subject_lower:
            return True
    
    # If not marketing and not in any known categories, consider it important
    return True

def get_emails():
    """Get important unread emails"""
    mail = imaplib.IMAP4_SSL(IMAP_SERVER)
    mail.login(EMAIL, PASSWORD)
    
    important_emails = []
    
    # Check INBOX
    mail.select('INBOX')
    status, search_data = mail.search(None, 'UNSEEN')
    
    if status == 'OK':
        unseen_ids = search_data[0].split()
        
        for msg_id in unseen_ids:
            typ, msg_data = mail.fetch(msg_id, '(RFC822)')
            for response_part in msg_data:
                if isinstance(response_part, tuple):
                    msg = email.message_from_bytes(response_part[1])
                    
                    from_header = msg['From']
                    subject = msg['subject'] or '(无主题)'
                    
                    # Extract sender email
                    if '<' in from_header:
                        sender_email = from_header.split('<')[1].strip('>')
                        sender_name = from_header.split('<')[0].strip()
                    else:
                        sender_email = from_header
                        sender_name = from_header
                    
                    if is_important_email(sender_email, subject):
                        important_emails.append({
                            'id': msg_id.decode() if isinstance(msg_id, bytes) else msg_id,
                            'from': sender_name,
                            'from_email': sender_email,
                            'subject': subject,
                        })
                        
                        # Mark as read
                        mail.store(msg_id, '+FLAGS', '\\Seen')
    
    # Check Archive folder too
    try:
        mail.select('"&UXZO1mWHTvZZOQ-/Archive"')
        status, search_data = mail.search(None, 'UNSEEN')
        if status == 'OK':
            unseen_ids = search_data[0].split()
            for msg_id in unseen_ids[:3]:  # Just check a few
                typ, msg_data = mail.fetch(msg_id, '(RFC822)')
                for response_part in msg_data:
                    if isinstance(response_part, tuple):
                        msg = email.message_from_bytes(response_part[1])
                        from_header = msg['From']
                        subject = msg['subject'] or '(无主题)'
                        if is_important_email(from_header, subject):
                            important_emails.append({
                                'id': msg_id.decode() if isinstance(msg_id, bytes) else msg_id,
                                'from': from_header,
                                'subject': subject,
                            })
                            mail.store(msg_id, '+FLAGS', '\\Seen')
    except:
        pass
    
    mail.logout()
    return important_emails

def format_summary(emails):
    """Format email summary for QQ message"""
    if not emails:
        return "📬 早上好！你的邮箱没有需要处理的重要邮件~"
    
    message = "📬 早上好！今日邮件汇总：\n\n"
    
    for i, email_info in enumerate(emails[:10], 1):  # Max 10 emails
        subject = email_info['subject'][:50]
        if len(email_info['subject']) > 50:
            subject += '...'
        message += f"{i}. 📧 {email_info['from']}\n"
        message += f"   {subject}\n\n"
    
    if len(emails) > 10:
        message += f"... 还有 {len(emails) - 10} 封重要邮件\n"
    
    message += f"\n✅ 已标记为已读"
    
    return message

if __name__ == '__main__':
    emails = get_emails()
    summary = format_summary(emails)
    print(summary)
    
    # Also save to file for debugging
    with open('/tmp/email_summary.txt', 'w') as f:
        f.write(summary)
