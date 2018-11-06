declare module 'gluegun-fix' {
  interface GluegunFileSystemInspectTreeResult {
    /** The filename */
    name: string
    /** The type of resource. */
    type: 'file' | 'dir' | 'symlink'
    /** The size in bytes. */
    size: number
    /** The relative path from the inspected directory. */
    relativePath?: string
    /** The md5 if the checksum was set to `md5` */
    md5?: string
    /** The sha1 if the checksum was set to `sha1` */
    sha1?: string
    /** The sha256 if the checksum was set to `sha256` */
    sha256?: string
    /** The sha512 if the checksum was set to `sha512` */
    sha512?: string
    /** Children results */
    children?: GluegunFileSystemInspectTreeResult[]
  }
}
