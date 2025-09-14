#!/usr/bin/env python3

"""
Security Report Analysis Tool
Analyzes OWASP ZAP and other security scan results to generate actionable recommendations
"""

import json
import xml.etree.ElementTree as ET
import argparse
import os
import sys
from datetime import datetime
from typing import Dict, List, Any
import re

class SecurityReportAnalyzer:
    def __init__(self, reports_dir: str):
        self.reports_dir = reports_dir
        self.findings = []
        self.recommendations = []
        self.risk_summary = {
            'critical': 0,
            'high': 0,
            'medium': 0,
            'low': 0,
            'informational': 0
        }
    
    def analyze_zap_json_report(self, json_file: str) -> None:
        """Analyze OWASP ZAP JSON report"""
        try:
            with open(json_file, 'r') as f:
                data = json.load(f)
            
            print(f"📊 Analyzing ZAP JSON report: {json_file}")
            
            if 'site' in data and len(data['site']) > 0:
                alerts = data['site'][0].get('alerts', [])
                
                for alert in alerts:
                    finding = self._parse_zap_alert(alert)
                    self.findings.append(finding)
                    self._update_risk_summary(finding['risk'])
                
                print(f"   Found {len(alerts)} security alerts")
            else:
                print("   No alerts found in ZAP report")
                
        except Exception as e:
            print(f"❌ Error analyzing ZAP JSON report: {e}")
    
    def analyze_zap_xml_report(self, xml_file: str) -> None:
        """Analyze OWASP ZAP XML report"""
        try:
            tree = ET.parse(xml_file)
            root = tree.getroot()
            
            print(f"📊 Analyzing ZAP XML report: {xml_file}")
            
            alerts = root.findall('.//alertitem')
            
            for alert in alerts:
                finding = self._parse_zap_xml_alert(alert)
                self.findings.append(finding)
                self._update_risk_summary(finding['risk'])
            
            print(f"   Found {len(alerts)} security alerts")
            
        except Exception as e:
            print(f"❌ Error analyzing ZAP XML report: {e}")
    
    def _parse_zap_alert(self, alert: Dict) -> Dict:
        """Parse ZAP JSON alert into standardized finding"""
        risk_map = {
            'High': 'high',
            'Medium': 'medium',
            'Low': 'low',
            'Informational': 'informational'
        }
        
        risk_desc = alert.get('riskdesc', 'Unknown')
        risk = risk_map.get(risk_desc.split(' ')[0], 'unknown')
        
        return {
            'id': alert.get('pluginid', 'unknown'),
            'name': alert.get('name', 'Unknown Alert'),
            'risk': risk,
            'confidence': alert.get('confidence', 'Unknown'),
            'description': alert.get('desc', ''),
            'solution': alert.get('solution', ''),
            'reference': alert.get('reference', ''),
            'instances': len(alert.get('instances', [])),
            'urls': [inst.get('uri', '') for inst in alert.get('instances', [])],
            'cwe_id': alert.get('cweid', ''),
            'wasc_id': alert.get('wascid', ''),
            'source': 'ZAP'
        }
    
    def _parse_zap_xml_alert(self, alert: ET.Element) -> Dict:
        """Parse ZAP XML alert into standardized finding"""
        risk_map = {
            '3': 'high',
            '2': 'medium',
            '1': 'low',
            '0': 'informational'
        }
        
        risk_code = alert.find('riskcode')
        risk = risk_map.get(risk_code.text if risk_code is not None else '0', 'unknown')
        
        instances = alert.findall('instances/instance')
        
        return {
            'id': alert.find('pluginid').text if alert.find('pluginid') is not None else 'unknown',
            'name': alert.find('name').text if alert.find('name') is not None else 'Unknown Alert',
            'risk': risk,
            'confidence': alert.find('confidence').text if alert.find('confidence') is not None else 'Unknown',
            'description': alert.find('desc').text if alert.find('desc') is not None else '',
            'solution': alert.find('solution').text if alert.find('solution') is not None else '',
            'reference': alert.find('reference').text if alert.find('reference') is not None else '',
            'instances': len(instances),
            'urls': [inst.find('uri').text for inst in instances if inst.find('uri') is not None],
            'cwe_id': alert.find('cweid').text if alert.find('cweid') is not None else '',
            'wasc_id': alert.find('wascid').text if alert.find('wascid') is not None else '',
            'source': 'ZAP'
        }
    
    def _update_risk_summary(self, risk: str) -> None:
        """Update risk summary counters"""
        if risk in self.risk_summary:
            self.risk_summary[risk] += 1
    
    def generate_recommendations(self) -> None:
        """Generate security recommendations based on findings"""
        print("🔍 Generating security recommendations...")
        
        # Group findings by type
        finding_types = {}
        for finding in self.findings:
            finding_type = finding['name']
            if finding_type not in finding_types:
                finding_types[finding_type] = []
            finding_types[finding_type].append(finding)
        
        # Generate recommendations for each finding type
        for finding_type, findings in finding_types.items():
            if findings[0]['risk'] in ['critical', 'high']:
                priority = 'HIGH'
            elif findings[0]['risk'] == 'medium':
                priority = 'MEDIUM'
            else:
                priority = 'LOW'
            
            recommendation = {
                'priority': priority,
                'finding_type': finding_type,
                'count': len(findings),
                'risk': findings[0]['risk'],
                'description': findings[0]['description'][:200] + '...' if len(findings[0]['description']) > 200 else findings[0]['description'],
                'solution': findings[0]['solution'],
                'affected_urls': list(set([url for finding in findings for url in finding['urls']]))[:5],
                'cwe_id': findings[0]['cwe_id']
            }
            
            self.recommendations.append(recommendation)
        
        # Sort recommendations by priority and risk
        priority_order = {'HIGH': 0, 'MEDIUM': 1, 'LOW': 2}
        risk_order = {'critical': 0, 'high': 1, 'medium': 2, 'low': 3, 'informational': 4}
        
        self.recommendations.sort(key=lambda x: (priority_order.get(x['priority'], 3), risk_order.get(x['risk'], 5)))
    
    def generate_executive_summary(self) -> str:
        """Generate executive summary"""
        total_findings = sum(self.risk_summary.values())
        
        if total_findings == 0:
            return "✅ **EXCELLENT**: No security vulnerabilities were identified during the assessment."
        
        critical_high = self.risk_summary['critical'] + self.risk_summary['high']
        
        if critical_high == 0:
            status = "✅ **GOOD**: No critical or high-risk vulnerabilities found."
        elif critical_high <= 3:
            status = "⚠️ **ATTENTION REQUIRED**: Few high-risk vulnerabilities identified."
        else:
            status = "🚨 **IMMEDIATE ACTION REQUIRED**: Multiple high-risk vulnerabilities found."
        
        summary = f"""
{status}

**Risk Distribution:**
- Critical: {self.risk_summary['critical']}
- High: {self.risk_summary['high']}
- Medium: {self.risk_summary['medium']}
- Low: {self.risk_summary['low']}
- Informational: {self.risk_summary['informational']}

**Total Findings:** {total_findings}
"""
        return summary
    
    def generate_detailed_report(self, output_file: str) -> None:
        """Generate detailed security analysis report"""
        print(f"📝 Generating detailed report: {output_file}")
        
        with open(output_file, 'w') as f:
            f.write("# Security Analysis Report\n")
            f.write("## Blockchain EMR System\n\n")
            f.write(f"**Generated:** {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}\n\n")
            
            # Executive Summary
            f.write("## Executive Summary\n")
            f.write(self.generate_executive_summary())
            f.write("\n\n")
            
            # Risk Summary
            f.write("## Risk Summary\n\n")
            f.write("| Risk Level | Count | Percentage |\n")
            f.write("|------------|-------|------------|\n")
            total = sum(self.risk_summary.values())
            for risk, count in self.risk_summary.items():
                percentage = (count / total * 100) if total > 0 else 0
                f.write(f"| {risk.title()} | {count} | {percentage:.1f}% |\n")
            f.write("\n")
            
            # Top Recommendations
            f.write("## Priority Recommendations\n\n")
            high_priority = [r for r in self.recommendations if r['priority'] == 'HIGH']
            
            if high_priority:
                for i, rec in enumerate(high_priority[:10], 1):
                    f.write(f"### {i}. {rec['finding_type']} ({rec['count']} instances)\n")
                    f.write(f"**Risk Level:** {rec['risk'].title()}\n")
                    f.write(f"**Priority:** {rec['priority']}\n\n")
                    f.write(f"**Description:** {rec['description']}\n\n")
                    f.write(f"**Solution:** {rec['solution']}\n\n")
                    if rec['cwe_id']:
                        f.write(f"**CWE ID:** {rec['cwe_id']}\n\n")
                    if rec['affected_urls']:
                        f.write("**Sample Affected URLs:**\n")
                        for url in rec['affected_urls']:
                            f.write(f"- {url}\n")
                        f.write("\n")
                    f.write("---\n\n")
            else:
                f.write("No high-priority recommendations at this time.\n\n")
            
            # All Findings
            f.write("## Detailed Findings\n\n")
            for i, finding in enumerate(self.findings, 1):
                f.write(f"### Finding {i}: {finding['name']}\n")
                f.write(f"- **Risk:** {finding['risk'].title()}\n")
                f.write(f"- **Confidence:** {finding['confidence']}\n")
                f.write(f"- **Plugin ID:** {finding['id']}\n")
                f.write(f"- **Instances:** {finding['instances']}\n")
                if finding['cwe_id']:
                    f.write(f"- **CWE ID:** {finding['cwe_id']}\n")
                f.write(f"\n**Description:** {finding['description']}\n\n")
                if finding['solution']:
                    f.write(f"**Solution:** {finding['solution']}\n\n")
                f.write("---\n\n")
    
    def analyze_all_reports(self) -> None:
        """Analyze all available security reports"""
        print(f"🔍 Scanning for security reports in: {self.reports_dir}")
        
        if not os.path.exists(self.reports_dir):
            print(f"❌ Reports directory not found: {self.reports_dir}")
            return
        
        # Look for ZAP reports
        for filename in os.listdir(self.reports_dir):
            filepath = os.path.join(self.reports_dir, filename)
            
            if filename.endswith('.json') and 'zap' in filename.lower():
                self.analyze_zap_json_report(filepath)
            elif filename.endswith('.xml') and 'zap' in filename.lower():
                self.analyze_zap_xml_report(filepath)
        
        print(f"📊 Analysis complete. Found {len(self.findings)} total findings.")
        
        # Generate recommendations
        self.generate_recommendations()
        
        # Generate detailed report
        output_file = os.path.join(self.reports_dir, 'security-analysis-report.md')
        self.generate_detailed_report(output_file)
        
        # Print summary
        print("\n" + "="*60)
        print("SECURITY ANALYSIS SUMMARY")
        print("="*60)
        print(self.generate_executive_summary())
        print(f"\n📄 Detailed report saved to: {output_file}")

def main():
    parser = argparse.ArgumentParser(description='Analyze security scan reports')
    parser.add_argument('--reports-dir', default='./security/reports', 
                       help='Directory containing security reports')
    parser.add_argument('--output', default='security-analysis-report.md',
                       help='Output report filename')
    
    args = parser.parse_args()
    
    analyzer = SecurityReportAnalyzer(args.reports_dir)
    analyzer.analyze_all_reports()

if __name__ == '__main__':
    main()
